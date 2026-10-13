/* =========================================================================
 *  SPEICHERN & LOGIN  –  die einzige Stelle, die für die Veröffentlichung
 *  ausgetauscht wird. Alles andere (Design, Seiten, Admin) bleibt gleich.
 *
 *  DEMO   (storage: 'demo')   Inhalte, Bilder und Login bleiben in diesem
 *                             Browser (IndexedDB). Nichts verlässt das Gerät.
 *  LIVE   (storage: 'server') Spricht mit einer kleinen PHP-Datei (api.php):
 *                             Inhalt  -> content.json
 *                             Bilder  -> Ordner uploads/
 *                             Passwort nur als Hash auf dem Server.
 *
 *  Schnittstelle (beide Varianten identisch, alle Methoden async):
 *    init()                          vorbereiten
 *    loadContent()     -> object|null  gespeicherter Inhalt (null = Original)
 *    saveContent(content)            speichern
 *    resetContent()                  gespeicherten Stand verwerfen
 *    uploadImage(blob, name) -> path z. B. "uploads/foto-1a2b.webp"
 *    imageUrl(path)    -> url        (synchron) Adresse für <img src>
 *    login(user, pass) -> boolean
 *    logout()
 *    isLoggedIn()      -> boolean
 *
 *  Gespeicherter Inhalt:
 *    { version, data: <wie data.js>, i18n: {sprache: {"schlüssel": text}},
 *      seo: {sprache: {seite: {title, description}}}, alts: {sprache: {bildpfad: text}} }
 *
 *  API-Vertrag für api.php (JSON, Session-Cookie):
 *    POST ?action=login   {user,pass}          -> {ok}
 *    POST ?action=logout                        -> {ok}
 *    GET  ?action=session                       -> {loggedIn}
 *    GET  content.json                          -> Inhalt
 *    POST ?action=save    {content}             -> {ok}
 *    POST ?action=reset                         -> {ok}
 *    POST ?action=upload  multipart "file"      -> {ok,path}
 * ========================================================================= */
window.SITE_CONFIG = {
  storage: 'demo',                 // 'demo' | 'server'
  api: 'api.php',
  siteUrl: 'https://www.drp-group.lu',
  // Demo-Zugang (nur Demo!). Gespeichert ist nur der SHA-256-Hash.
  demoUser: 'drp',
  demoPassHash: '5f8d10ae0845127e533a9c2f78ee7a78e1e6d5e273acb1baf11bef9a755fa729'
};

(function () {
  'use strict';

  /* ---------- kleine Hilfen ---------- */
  function sha256(str) {
    function rrot(v, a) { return (v >>> a) | (v << (32 - a)); }
    var k = [], h = [], i, j, result = '';
    var isPrime = function (n) { for (var f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
    for (var c = 2, n = 0; n < 64; c++) if (isPrime(c)) { if (n < 8) h[n] = (Math.pow(c, 1 / 2) * 4294967296) | 0; k[n++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; }
    var bytes = unescape(encodeURIComponent(str)), words = [], bitLen = bytes.length * 8;
    bytes += '\x80'; while (bytes.length % 64 - 56) bytes += '\x00';
    for (i = 0; i < bytes.length; i++) { j = bytes.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((bitLen / 4294967296) | 0); words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = h.slice(0);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = h[0], e = h[4];
        var t1 = h[7] + (rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rrot(w15, 7) ^ rrot(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rrot(w2, 17) ^ rrot(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
        h = [(t1 + t2) | 0].concat(h); h[4] = (h[4] + t1) | 0; h.length = 8;
      }
      for (i = 0; i < 8; i++) h[i] = (h[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (h[i] >> (j * 8)) & 255; result += (b < 16 ? '0' : '') + b.toString(16); }
    return result;
  }

  var idb = {
    db: null,
    open: function () {
      var self = this;
      if (self.db) return Promise.resolve(self.db);
      return new Promise(function (res, rej) {
        var r = indexedDB.open('drp-demo', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); r.result.createObjectStore('img'); };
        r.onsuccess = function () { self.db = r.result; res(self.db); };
        r.onerror = function () { rej(r.error); };
      });
    },
    op: function (store, mode, fn) {
      return this.open().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction(store, mode), st = tx.objectStore(store), out = fn(st);
          tx.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    },
    get: function (s, k) { return this.op(s, 'readonly', function (st) { return st.get(k); }); },
    set: function (s, k, v) { return this.op(s, 'readwrite', function (st) { st.put(v, k); }); },
    del: function (s, k) { return this.op(s, 'readwrite', function (st) { st.delete(k); }); },
    clear: function (s) { return this.op(s, 'readwrite', function (st) { st.clear(); }); },
    keys: function (s) { return this.op(s, 'readonly', function (st) { return st.getAllKeys(); }); }
  };

  /* =================== DEMO: alles bleibt im Browser =================== */
  var DemoStorage = {
    urls: {},
    init: function () {
      var self = this;
      return idb.keys('img').then(function (keys) {
        return Promise.all((keys || []).map(function (k) {
          return idb.get('img', k).then(function (v) { if (v) self.urls[k] = URL.createObjectURL(v instanceof Blob ? v : new Blob([v.buf], { type: v.type })); });
        }));
      }).catch(function () {});
    },
    loadContent: function () { return idb.get('kv', 'content').then(function (c) { return c || null; }).catch(function () { return null; }); },
    saveContent: function (content) {
      var self = this, json = JSON.stringify(content);
      return idb.set('kv', 'content', JSON.parse(json)).then(function () {
        // nicht mehr verwendete hochgeladene Bilder entfernen
        return idb.keys('img').then(function (keys) {
          return Promise.all((keys || []).filter(function (k) { return json.indexOf(k) < 0; }).map(function (k) {
            delete self.urls[k]; return idb.del('img', k);
          }));
        });
      });
    },
    resetContent: function () { this.urls = {}; return Promise.all([idb.del('kv', 'content'), idb.clear('img')]); },
    uploadImage: function (blob, name) {
      var self = this, path = 'uploads/' + name;
      // als ArrayBuffer ablegen: Safari kann Blobs in IndexedDB nicht überall speichern (z. B. privates Fenster)
      return new Response(blob).arrayBuffer().then(function (buf) { return idb.set('img', path, { type: blob.type, buf: buf }); })
        .then(function () { self.urls[path] = URL.createObjectURL(blob); return path; });
    },
    imageUrl: function (path) { return !path ? '' : this.urls[path] || path; },
    login: function (user, pass) {
      var ok = (user || '').trim().toLowerCase() === SITE_CONFIG.demoUser && sha256(pass || '') === SITE_CONFIG.demoPassHash;
      try { if (ok) sessionStorage.setItem('drp-admin', '1'); } catch (e) { DemoStorage._mem = ok; }
      return Promise.resolve(ok);
    },
    logout: function () { try { sessionStorage.removeItem('drp-admin'); } catch (e) { DemoStorage._mem = false; } return Promise.resolve(); },
    isLoggedIn: function () { var v = false; try { v = sessionStorage.getItem('drp-admin') === '1'; } catch (e) { v = !!DemoStorage._mem; } return Promise.resolve(v); }
  };

  /* =================== LIVE: kleine PHP-Datei auf dem Webspace =================== */
  function api(action, body, isForm) {
    var opt = { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
    if (body) { if (isForm) opt.body = body; else { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; } }
    return fetch(SITE_CONFIG.api + '?action=' + action, opt).then(function (r) { return r.json(); });
  }
  var ServerStorage = {
    init: function () { return Promise.resolve(); },
    loadContent: function () {
      return fetch('content.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    },
    saveContent: function (content) { return api('save', { content: content }).then(function (r) { if (!r.ok) throw new Error('save'); }); },
    resetContent: function () { return api('reset', {}); },
    uploadImage: function (blob, name) {
      var fd = new FormData(); fd.append('file', blob, name);
      return api('upload', fd, true).then(function (r) { if (!r.ok) throw new Error('upload'); return r.path; });
    },
    imageUrl: function (path) { return path || ''; },
    login: function (user, pass) { return api('login', { user: user, pass: pass }).then(function (r) { return !!r.ok; }); },
    logout: function () { return api('logout', {}); },
    isLoggedIn: function () { return api('session').then(function (r) { return !!r.loggedIn; }).catch(function () { return false; }); }
  };

  var S = window.SiteStorage = SITE_CONFIG.storage === 'server' ? ServerStorage : DemoStorage;

  /* ---------- gespeicherten Stand über das Original legen (vor dem ersten Aufbau der Seite) ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function setKey(dict, key, val) {
    var ks = key.split('.'), last = ks.pop(), o = dict;
    ks.forEach(function (k) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    o[last] = val;
  }
  var ORIGINAL = { data: clone(window.DRP_DATA), i18n: clone(window.DRP_I18N) };
  // hochgeladene Bilder ("uploads/…") → Adresse, die der Browser laden kann
  function resolve(o) {
    if (typeof o === 'string') return /^uploads\//.test(o) ? S.imageUrl(o) : o;
    if (Array.isArray(o)) return o.map(resolve);
    if (o && typeof o === 'object') { var r = {}; for (var k in o) r[k] = resolve(o[k]); return r; }
    return o;
  }
  function apply(c) {
    window.DRP_CONTENT = c;
    window.DRP_DATA = resolve(c && c.data ? c.data : ORIGINAL.data);
    var i18n = clone(ORIGINAL.i18n);
    if (c && c.i18n) Object.keys(c.i18n).forEach(function (l) {
      if (!i18n[l]) return;
      Object.keys(c.i18n[l]).forEach(function (k) { setKey(i18n[l], k, c.i18n[l][k]); });
    });
    window.DRP_I18N = i18n;
  }
  window.DRP_STORE = { original: ORIGINAL, apply: apply, resolve: resolve, clone: clone };

  // nie länger als 1,5 s warten (z. B. gesperrter Speicher im privaten Fenster)
  var timeout = new Promise(function (r) { setTimeout(function () { r(null); }, 1500); });
  window.DRP_READY = Promise.race([
    Promise.resolve().then(function () { return S.init(); }).then(function () { return S.loadContent(); }).catch(function () { return null; }),
    timeout
  ]).then(function (c) { if (c) apply(c); });
})();
