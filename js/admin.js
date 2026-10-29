/* =========================================================================
 *  Admin-Bereich: Bearbeiten direkt auf der Seite (nur nach Login sichtbar)
 *  Aufbau wie bei der Krombach-Demo. Speichern/Login: js/storage.js
 *
 *  Texte:  app.js markiert im Bearbeiten-Modus jeden Text mit seiner Herkunft
 *          (Sprachdatei-Schlüssel oder Feld in data.js). Hier wird daraus eine
 *          bearbeitbare Stelle. Ohne Login passiert nichts davon.
 *  Bilder: werden über ihre Adresse dem Feld in data.js zugeordnet.
 * ========================================================================= */
(function () {
  'use strict';
  var A = window.DRP_APP, S = window.SiteStorage, ST = window.DRP_STORE;
  if (!A || !S || !ST) return;
  var C = null, bar, ctxBar, sel = null, dirty = false, undo = [], busy = false, admin = false, mo = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clone = ST.clone;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function getP(o, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, o); }
  function setP(o, path, val) {
    var ks = path.split('.'), last = ks.pop();
    ks.reduce(function (o, k) { if (o[k] == null) o[k] = {}; return o[k]; }, o)[last] = val;
  }
  function lang() { return A.lang(); }
  var MARK = /([^]*)([^]*)/g, STRIP = /[^]*|/g;
  function strip(s) { return String(s).replace(STRIP, ''); }
  function fresh() {
    var c = window.DRP_CONTENT ? clone(window.DRP_CONTENT) : {};
    return { version: 1, dataSig: ST.dataSig, data: c.data || clone(ST.original.data), i18n: c.i18n || {}, seo: c.seo || {}, alts: c.alts || {}, trash: c.trash || [], legal: c.legal || null };
  }

  /* Seite, für die Titel/Beschreibung gelten (z. B. „bien:apartment-01…“) */
  function pageKey() { return A.page + (A.param('id') ? ':' + A.param('id') : '') + (document.body.dataset.bereich ? ':' + document.body.dataset.bereich : ''); }

  /* ------------------------------------------------------------ öffentlich: SEO-Angaben, Bildbeschreibungen, Login-Link */
  function seoFor(c) { var s = c && c.seo && c.seo[lang()]; return s && s[pageKey()]; }
  function applySeo() {
    var c = admin ? C : window.DRP_CONTENT, s = seoFor(c);
    if (s && s.title) document.title = s.title;
    var m = $('meta[name="description"]');
    if (s && s.description) {
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = s.description;
    }
  }
  // Bildadresse → gespeicherter Pfad (für hochgeladene Bilder ist die Adresse ein blob:)
  function pathOfSrc(src) {
    if (!src) return '';
    for (var k in S.urls || {}) if (S.urls[k] === src) return k;
    return src;
  }
  function applyAlts(root) {
    var c = admin ? C : window.DRP_CONTENT, alts = c && c.alts && c.alts[lang()];
    if (!alts) return;
    $$('img', root).forEach(function (im) { var a = alts[pathOfSrc(im.getAttribute('src'))]; if (a != null && a !== '') im.alt = a; });
  }
  function loginLink() {
    var fb = $('.footer-bottom'); if (!fb || $('.k-login', fb)) return;
    var a = document.createElement('a');
    a.className = 'k-login'; a.href = '#'; a.rel = 'nofollow'; a.textContent = admin ? 'Abmelden' : 'Login';
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (admin) logout(); else loginDialog(); });
    var first = fb.firstElementChild; (first || fb).appendChild(a);
  }
  A.hooks.push(function (root) {
    loginLink(); applySeo(); applyAlts(document);
    if (admin) { process(document.body); stripTitle(); chips(); if (sel) reselect(sel.path); }
  });

  /* ------------------------------------------------------------ Fenster, Hinweise */
  function frag(html) { var t = document.createElement('template'); t.innerHTML = html; return t.content; }
  function sheet(title, body, opts) {
    opts = opts || {};
    closeSheet();
    var wrap = document.createElement('div');
    wrap.className = 'kx-sheet-wrap';
    wrap.innerHTML = '<div class="kx-sheet' + (opts.wide ? ' kx-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="kx-sheet-head"><h2>' + esc(title) + '</h2><button class="kx-x" aria-label="Schließen">✕</button></div>' +
      '<div class="kx-sheet-body"></div></div>';
    $('.kx-sheet-body', wrap).appendChild(typeof body === 'string' ? frag(body) : body);
    document.body.appendChild(wrap);
    $('.kx-x', wrap).onclick = function () { closeSheet(); if (opts.onClose) opts.onClose(); };
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) { closeSheet(); if (opts.onClose) opts.onClose(); } });
    var f = $('input:not([type=file]), textarea, select', wrap); if (f && !opts.noFocus) setTimeout(function () { f.focus(); }, 60);
    return wrap;
  }
  function closeSheet() { $$('.kx-sheet-wrap').forEach(function (w) { w.remove(); }); }
  function toast(msg, ms) {
    var t = document.createElement('div'); t.className = 'kx-toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('kx-out'); setTimeout(function () { t.remove(); }, 400); }, ms || 2600);
  }
  function confirmBox(title, text, okLabel, danger, noLabel) {
    return new Promise(function (res) {
      var w = sheet(title, '<p class="kx-p">' + text + '</p><div class="kx-row"><button class="kx-btn kx-ghost" data-a="no">' + esc(noLabel || 'Abbrechen') + '</button>' +
        '<button class="kx-btn ' + (danger ? 'kx-danger' : 'kx-primary') + '" data-a="yes">' + esc(okLabel) + '</button></div>', { noFocus: true, onClose: function () { res(null); } });
      $('[data-a=no]', w).onclick = function () { closeSheet(); res(false); };
      $('[data-a=yes]', w).onclick = function () { closeSheet(); res(true); };
    });
  }

  /* ------------------------------------------------------------ Login */
  function loginDialog() {
    var w = sheet('Anmelden', '<form class="kx-form" autocomplete="on">' +
      '<label>Benutzername<input name="u" autocomplete="username" autocapitalize="none" required></label>' +
      '<label>Passwort<input name="p" type="password" autocomplete="current-password" required></label>' +
      '<p class="kx-err" hidden>Benutzername oder Passwort stimmt nicht.</p>' +
      '<button class="kx-btn kx-primary kx-block" type="submit">Anmelden</button></form>');
    $('form', w).addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      S.login(f.u.value, f.p.value).then(function (ok) {
        if (!ok) { $('.kx-err', w).hidden = false; f.p.value = ''; f.p.focus(); return; }
        closeSheet(); start(); toast('Angemeldet – tippen Sie auf einen Text oder ein Bild, um es zu ändern.', 4200);
      });
    });
  }
  function logout() {
    var go = function () {
      S.logout().then(function () {
        admin = false; window.DRP_EDIT = false; dirty = false; undo = []; sel = null;
        if (bar) bar.remove(); if (ctxBar) ctxBar.remove(); bar = ctxBar = null;
        if (mo) { mo.disconnect(); mo = null; }
        document.documentElement.classList.remove('kx-on', 'kx-ctx-on');
        ST.apply(window.DRP_SAVED || null); C = null;
        A.render();
      });
    };
    if (dirty) confirmBox('Abmelden', 'Es gibt ungespeicherte Änderungen. Ohne Speichern abmelden?', 'Ohne Speichern abmelden', true).then(function (ok) { if (ok) go(); });
    else go();
  }

  /* ------------------------------------------------------------ Bearbeiten-Modus */
  function start() {
    admin = true; window.DRP_EDIT = true;
    window.DRP_SAVED = window.DRP_CONTENT || null;
    var stale = window.DRP_CONTENT && window.DRP_CONTENT.staleData;
    C = fresh();
    document.documentElement.classList.add('kx-on');
    if (stale) setTimeout(function () { toast('Die Website wurde inzwischen aktualisiert. Frühere Änderungen an Objekten, Team und Fotos gelten nicht mehr; Texte und Google-Angaben bleiben.', 7000); }, 4500);
    buildBar();
    observe();
    refresh();
  }
  // Inhalt anwenden und Seite neu aufbauen; Textfelder aus data.js bekommen ihre Herkunft
  var DATA_TEXT = [['items', ['titre']], ['team', ['nom', 'role']], ['bereiche', ['nom']]];
  function refresh() {
    ST.apply(C);
    var D = window.DRP_DATA;
    DATA_TEXT.forEach(function (x) {
      (D[x[0]] || []).forEach(function (o, i) {
        x[1].forEach(function (f) { if (typeof o[f] === 'string' && o[f]) o[f] = 'd:' + x[0] + '.' + i + '.' + f + '' + o[f] + ''; });
      });
    });
    ['texte', 'auteur'].forEach(function (f) { var c = D.site.citation; if (c && c[f]) c[f] = 'd:site.citation.' + f + '' + c[f] + ''; });
    imgIndex = null;
    A.render();
  }

  function buildBar() {
    if (bar) bar.remove();
    bar = document.createElement('div');
    bar.className = 'kx-bar';
    bar.innerHTML =
      '<button class="kx-b kx-save" data-a="save" disabled><span class="kx-i">✓</span><span>Speichern</span></button>' +
      '<button class="kx-b" data-a="undo" disabled><span class="kx-i">↶</span><span>Rückgängig</span></button>' +
      '<button class="kx-b" data-a="pages"><span class="kx-i">☰</span><span>Seiten</span></button>' +
      '<button class="kx-b" data-a="texts"><span class="kx-i">Aa</span><span>Texte</span></button>' +
      '<button class="kx-b" data-a="seo"><span class="kx-i">G</span><span>Google</span></button>' +
      '<button class="kx-b" data-a="more"><span class="kx-i">⋯</span><span>Mehr</span></button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      ({ save: save, undo: doUndo, pages: pagesSheet, texts: textsSheet, seo: seoSheet, more: moreSheet })[b.getAttribute('data-a')]();
    });
    ctxBar = document.createElement('div');
    ctxBar.className = 'kx-ctx'; ctxBar.hidden = true;
    document.body.appendChild(ctxBar);
    ctxBar.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    updateBar();
  }
  function updateBar() {
    if (!bar) return;
    var s = $('[data-a=save]', bar);
    s.disabled = !dirty || busy;
    s.classList.toggle('kx-dirty', dirty);
    $('span:last-child', s).textContent = busy ? 'Speichert…' : dirty ? 'Speichern' : 'Gespeichert';
    $('[data-a=undo]', bar).disabled = !undo.length;
  }
  function change(fn, rerender) {
    undo.push(JSON.stringify(C));
    if (undo.length > 60) undo.shift();
    fn();
    dirty = true; updateBar();
    if (rerender !== false) refresh();
  }
  function doUndo() {
    if (!undo.length) return;
    C = JSON.parse(undo.pop());
    dirty = true; updateBar(); sel = null; showCtx();
    refresh();
    toast('Letzte Änderung rückgängig gemacht');
  }
  function save() {
    if (busy) return Promise.resolve();
    commitEditing();
    busy = true; updateBar();
    return S.saveContent(C).then(function () {
      busy = false; dirty = false; updateBar(); window.DRP_SAVED = clone(C);
      toast(window.SITE_CONFIG.storage === 'server' ? 'Gespeichert ✓ – die Seite ist aktualisiert.' : 'Gespeichert ✓ (Demo: in diesem Browser gespeichert)');
    }).catch(function () { busy = false; updateBar(); toast('Speichern hat nicht geklappt. Bitte erneut versuchen.', 5000); throw new Error('save'); });
  }
  window.addEventListener('beforeunload', function (e) { if (admin && dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ------------------------------------------------------------ Markierungen → bearbeitbare Stellen */
  var NO_EDIT = 'button, option, select, textarea, title, script, style, svg, .kx-text, .kx-bar, .kx-ctx, .kx-sheet-wrap, .kx-toast, .leaflet-container';
  function processText(node) {
    var v = node.data;
    if (v.indexOf('') < 0 && v.indexOf('') < 0) return;
    var p = node.parentElement;
    MARK.lastIndex = 0;
    if (!p || p.closest(NO_EDIT) || !MARK.test(v)) { node.data = strip(v); return; }
    MARK.lastIndex = 0;
    var f = document.createDocumentFragment(), last = 0, m;
    while ((m = MARK.exec(v))) {
      if (m.index > last) f.appendChild(document.createTextNode(strip(v.slice(last, m.index))));
      var span = document.createElement('span');
      span.className = 'kx-text'; span.setAttribute('data-ek', m[1]);
      span.contentEditable = 'true'; span.spellcheck = true; span.textContent = m[2];
      f.appendChild(span);
      last = MARK.lastIndex;
    }
    if (last < v.length) f.appendChild(document.createTextNode(strip(v.slice(last))));
    node.replaceWith(f);
  }
  function processAttrs(el) {
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.value.indexOf('') > -1 || a.value.indexOf('') > -1) el.setAttribute(a.name, strip(a.value));
    }
  }
  function process(root) {
    if (!root) return;
    if (root.nodeType === 3) { processText(root); return; }
    if (root.nodeType !== 1) return;
    processAttrs(root);
    $$('*', root).forEach(processAttrs);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(processText);
  }
  function stripTitle() { if (/[]/.test(document.title)) document.title = strip(document.title); }
  function observe() {
    if (mo) return;
    mo = new MutationObserver(function (ms) {
      if (!admin) return;
      ms.forEach(function (m) {
        if (m.type === 'attributes') { processAttrs(m.target); return; }
        Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.isConnected) process(n); });
      });
      stripTitle();
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['alt', 'title', 'aria-label', 'placeholder', 'value'] });
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  }

  /* ------------------------------------------------------------ Texte speichern */
  function commitText(el) {
    var key = el.getAttribute('data-ek');
    var val = el.textContent.replace(/\s+/g, ' ').trim();
    if (el._before === val) return;
    var cur = key.indexOf('d:') === 0 ? getP(C.data, key.slice(2)) : A.t(key).replace(STRIP, '');
    if (cur === val) return;
    change(function () {
      if (key.indexOf('d:') === 0) setP(C.data, key.slice(2), val);
      else { C.i18n[lang()] = C.i18n[lang()] || {}; C.i18n[lang()][key] = val; }
    }, false);
    ST.apply(C); refreshDataText();
    el._before = val;
    $$('.kx-text[data-ek="' + key + '"]').forEach(function (o) { if (o !== el) o.textContent = val; });
  }
  // nach dem Anwenden bleiben Textfelder bearbeitbar, ohne die Seite neu aufzubauen
  function refreshDataText() {
    var D = window.DRP_DATA;
    DATA_TEXT.forEach(function (x) {
      (D[x[0]] || []).forEach(function (o, i) { x[1].forEach(function (f) { if (typeof o[f] === 'string' && o[f]) o[f] = 'd:' + x[0] + '.' + i + '.' + f + '' + o[f] + ''; }); });
    });
  }
  function commitEditing() { var a = document.activeElement; if (a && a.classList && a.classList.contains('kx-text')) commitText(a); }

  document.addEventListener('focusin', function (e) {
    if (!admin) return;
    var t = e.target.closest && e.target.closest('.kx-text');
    if (t) t._before = t.textContent.replace(/\s+/g, ' ').trim();
  });
  document.addEventListener('focusout', function (e) {
    if (!admin) return;
    var t = e.target.closest && e.target.closest('.kx-text');
    if (t) commitText(t);
  });
  document.addEventListener('keydown', function (e) {
    if (!admin) return;
    var t = e.target.closest && e.target.closest('.kx-text');
    if (t && e.key === 'Enter') { e.preventDefault(); t.blur(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (t) commitText(t); save(); }
  });
  document.addEventListener('paste', function (e) {
    if (!admin || !(e.target.closest && e.target.closest('.kx-text'))) return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' '));
  });

  /* ------------------------------------------------------------ Klicks im Bearbeiten-Modus */
  document.addEventListener('click', function (e) {
    if (!admin) return;
    if (e.target.closest('.kx-bar, .kx-ctx, .kx-sheet-wrap, .kx-toast, .kx-chip, .k-login, .lang-menu, [data-lang]')) return;
    var a = e.target.closest('a[href]');
    if (a) e.preventDefault();
    var phEl = e.target.closest('.ph'); // Platzhalter ohne Foto: Foto hinzufügen (vor der Textbearbeitung: „Foto folgt“ ist auch ein Text)
    if (phEl && addPhoto(phEl)) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.target.closest('.kx-text, .kx-rich')) {
      if (e.target.closest('label')) e.preventDefault(); // sonst springt der Klick ins zugehörige Eingabefeld
      select(e.target); return;
    }
    if (e.target.closest('.hero') && !e.target.closest('.hero__scroll')) { e.preventDefault(); heroSheet(); return; } // Startseite oben: Foto oder Video (Verlauf liegt darüber)
    var vid = e.target.closest('.arch-film-v, #g-main video, video');
    if (vid) { var spec = videoSpec(vid); if (spec) { e.preventDefault(); e.stopPropagation(); videoSheet(spec); return; } }
    var img = e.target.closest('img');
    if (img && !e.target.closest('.leaflet-container')) { e.preventDefault(); e.stopPropagation(); select(img); imageSheet(img); return; }
    if (a) { select(e.target); return; }
    select(e.target);
  }, true);
  document.addEventListener('submit', function (e) { if (admin) e.preventDefault(); }, true);

  /* ------------------------------------------------------------ Bilder ↔ Felder in data.js */
  var imgIndex = null;
  function isImg(v) { return typeof v === 'string' && (/\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i.test(v) || /^(blob:|uploads\/)/.test(v)); }
  function indexImages() {
    if (imgIndex) return imgIndex;
    imgIndex = {};
    (function walk(o, path) {
      if (isImg(o)) { (imgIndex[o] = imgIndex[o] || []).push(path); return; }
      if (o && typeof o === 'object') for (var k in o) walk(o[k], path ? path + '.' + k : k);
    })(window.DRP_DATA, '');
    return imgIndex;
  }
  function imagePath(img) {
    var paths = indexImages()[img.getAttribute('src')] || [];
    if (!paths.length) return null;
    var pick = function (re) { return paths.filter(function (p) { return re.test(p); })[0]; };
    if (img.closest('.page-head')) return pick(/^(site\.entetes|bereiche\.\d+\.hero)/) || paths[0];
    if (img.closest('.hero__media')) return pick(/^site\.hero_image/) || paths[0];
    if (img.closest('.person')) return pick(/^team\./) || paths[0];
    return pick(/^(items|architecture|team)\./) || paths[0];
  }

  /* ------------------------------------------------------------ Auswahl + Leiste darüber */
  var LABEL = { items: 'Objekt', team: 'Person', 'architecture.photos': 'Foto' };
  function itemIndexByHref(href) {
    var m = /[?&]id=([^&#]+)/.exec(href || ''); if (!m) return -1;
    var id = decodeURIComponent(m[1]);
    for (var i = 0; i < C.data.items.length; i++) if (C.data.items[i].id === id) return i;
    return -1;
  }
  function blockOf(target) {
    var el = target.closest && target.closest('.card, .map-row, .fpc__card, .person, .arch-wall > li');
    if (!el) return null;
    if (el.matches('.arch-wall > li')) { var b = $('[data-k]', el); return b ? { el: el, list: 'architecture.photos', i: +b.getAttribute('data-k') } : null; }
    if (el.matches('.person')) {
      var im = $('img', el), p = im && imagePath(im), mm = p && /^team\.(\d+)/.exec(p);
      if (!mm) { var h = el.getAttribute('href') || '', id = (/[?&]id=([^&#]+)/.exec(h) || [])[1]; C.data.team.forEach(function (t, i) { if (t.id === id || t.url === h) mm = [0, i]; }); }
      return mm ? { el: el, list: 'team', i: +mm[1] } : null;
    }
    var link = el.matches('a') ? el : $('a[href*="id="]', el);
    var i = link ? itemIndexByHref(link.getAttribute('href')) : -1;
    return i > -1 ? { el: el, list: 'items', i: i } : null;
  }
  function select(target) {
    $$('.kx-sel').forEach(function (e) { e.classList.remove('kx-sel'); });
    var b = blockOf(target);
    sel = b ? { el: b.el, list: b.list, i: b.i, path: b.list + '.' + b.i } : null;
    if (sel) sel.el.classList.add('kx-sel');
    showCtx();
  }
  function reselect(path) {
    var m = /^(.*)\.(\d+)$/.exec(path); if (!m) { sel = null; showCtx(); return; }
    var list = m[1], i = +m[2], found = null;
    $$('.card, .map-row, .fpc__card, .person, .arch-wall > li').some(function (el) { var b = blockOf(el); if (b && b.list === list && b.i === i) { found = b; return true; } });
    if (found) { found.el.classList.add('kx-sel'); sel = { el: found.el, list: list, i: i, path: path }; } else sel = null;
    showCtx();
  }
  function showCtx() {
    if (!ctxBar) return;
    var html = '';
    if (sel && document.body.contains(sel.el)) {
      html = '<div class="kx-grp"><span class="kx-lbl">' + LABEL[sel.list] + '</span>' +
        '<button data-c="up" aria-label="Nach vorne">↑</button><button data-c="down" aria-label="Nach hinten">↓</button>' +
        (sel.list !== 'architecture.photos' ? '<button data-c="edit">✎ Angaben</button><button data-c="dup">⧉ Kopieren</button>' : '') +
        (sel.list === 'items' ? '<button data-c="open">Öffnen</button>' : '') +
        '<button data-c="del" class="kx-red">Löschen</button></div>';
    }
    ctxBar.innerHTML = html;
    ctxBar.hidden = !html;
    document.documentElement.classList.toggle('kx-ctx-on', !!html);
    $$('button', ctxBar).forEach(function (b) { b.onclick = function () { ctxAction(b.getAttribute('data-c')); }; });
  }
  function ctxAction(c) {
    if (!sel) return;
    var list = getP(C.data, sel.list), i = sel.i, it = list[i];
    if (c === 'up' || c === 'down') {
      var d = c === 'up' ? -1 : 1, j = i + d;
      // Objekte: mit dem nächsten Eintrag derselben Art tauschen (Immobilien und Projekte stehen in einer Liste)
      if (sel.list === 'items') while (j >= 0 && j < list.length && list[j].type !== it.type) j += d;
      if (j < 0 || j >= list.length) { toast(d < 0 ? 'Steht schon ganz vorne' : 'Steht schon ganz hinten'); return; }
      change(function () { var x = list.splice(i, 1)[0]; list.splice(j, 0, x); });
      reselect(sel.list + '.' + j);
    }
    if (c === 'edit') { if (sel.list === 'items') itemSheet(i); else teamSheet(i); }
    if (c === 'open') go(A.url(it));
    if (c === 'dup') {
      var copy = clone(it), base = it.id + '-kopie', id = base, n = 2;
      while (list.some(function (x) { return x.id === id; })) id = base + '-' + n++;
      copy.id = id;
      if (copy.titre) copy.titre += ' (Kopie)';
      if (copy.nom) { copy.nom += ' (Kopie)'; if (/^\/team\//.test(copy.url)) copy.url = '/team/' + id + '/'; }
      if ('a_laffiche' in copy) copy.a_laffiche = false;
      change(function () { list.splice(i + 1, 0, copy); });
      reselect(sel.list + '.' + (i + 1));
      toast('Kopie eingefügt – jetzt anpassen');
    }
    if (c === 'del') {
      if (sel.list === 'items') { deleteItem(it.id); return; }
      confirmBox(LABEL[sel.list] + ' löschen', sel.list === 'team' ? 'Die Person kommt in den Papierkorb (unter „Mehr“) und lässt sich dort wiederherstellen.' : 'Soll das wirklich gelöscht werden? (Mit „Rückgängig“ holen Sie es zurück.)', 'Löschen', true).then(function (ok) {
        if (!ok) return;
        var listName = sel.list; sel = null;
        change(function () { var x = list.splice(i, 1)[0]; if (listName === 'team') C.trash.unshift({ kind: 'team', obj: x, index: i, at: Date.now() }); });
        showCtx();
      });
    }
  }

  /* ------------------------------------------------------------ Bild ändern */
  function prepareImage(file, opts) {
    opts = opts || {};
    if (file.type === 'image/svg+xml') return Promise.resolve({ blob: file, ext: 'svg', ratio: 1 });
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, (opts.maxW || 1600) / w), cw = Math.round(w * scale), ch = Math.round(h * scale);
        var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        var done = function (b, ext) { res({ blob: b, ext: ext, ratio: Math.round(w / h * 1000) / 1000 }); };
        cv.toBlob(function (b) {
          if (b && b.type === 'image/webp') return done(b, 'webp');
          // ohne WebP (Safari): PNG bleibt PNG (Logo mit transparentem Hintergrund), Fotos werden JPG
          if (file.type === 'image/png') cv.toBlob(function (pn) { pn ? done(pn, 'png') : rej(new Error('encode')); }, 'image/png');
          else cv.toBlob(function (j) { j ? done(j, 'jpg') : rej(new Error('encode')); }, 'image/jpeg', 0.82);
        }, 'image/webp', 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('format')); };
      img.src = url;
    });
  }
  function slug(s) {
    return String(s || 'bild').replace(STRIP, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'bild';
  }
  function upload(file, name, opts) {
    return prepareImage(file, opts).then(function (r) {
      return S.uploadImage(r.blob, slug(name) + '-' + Math.random().toString(36).slice(2, 7) + '.' + r.ext).then(function (p) { return { path: p, ratio: r.ratio }; });
    });
  }
  function pickers(multi) {
    return '<div class="kx-row kx-pick"><label class="kx-btn kx-primary">📁 Foto aus Galerie<input type="file" accept="image/*"' + (multi ? ' multiple' : '') + ' hidden></label>' +
      '<label class="kx-btn kx-primary">📷 Foto aufnehmen<input type="file" accept="image/*" capture="environment" hidden></label></div>';
  }
  function working(on) { var w = $('.kx-sheet'); if (w) w.classList.toggle('kx-working', on); }
  function altGet(p) { var a = C.alts[lang()]; return (a && a[p]) || ''; }
  function altSet(p, v) { C.alts[lang()] = C.alts[lang()] || {}; if (v) C.alts[lang()][p] = v; else delete C.alts[lang()][p]; }
  function listOfPath(path) { // Bild in einer Bildliste? → {list, i}
    var m = /^(items\.\d+\.images)\.(\d+)$/.exec(path) || /^(architecture\.photos)\.(\d+)\.image$/.exec(path);
    return m ? { list: m[1], i: +m[2] } : null;
  }
  function imageSheet(img) {
    var path = imagePath(img);
    if (!path) { toast('Dieses Bild gehört zum Design (z. B. Logo) und wird hier nicht geändert.', 4000); return; }
    var stored = getP(C.data, path), inList = listOfPath(path);
    var w = sheet('Bild', '<div class="kx-form"><div class="kx-prev"><img src="' + esc(S.imageUrl(stored)) + '" alt=""></div>' + pickers(false) +
      '<label>Bildbeschreibung (für Google und Screenreader, Sprache: ' + lang().toUpperCase() + ')<input name="alt" value="' + esc(altGet(stored) || strip(img.alt || '')) + '" placeholder="z. B. Residenz in Steinsel, Ansicht von der Straße"></label>' +
      '<p class="kx-hint">Das Bild wird automatisch verkleinert und für schnelles Laden optimiert.</p>' +
      '<div class="kx-row">' + (inList ? '<button class="kx-btn kx-ghost kx-red" data-a="del">Bild löschen</button>' : '') + '<button class="kx-btn kx-primary" data-a="ok">Fertig</button></div></div>', { noFocus: true });
    $$('input[type=file]', w).forEach(function (inp) {
      inp.onchange = function () {
        var f = inp.files[0]; if (!f) return;
        working(true);
        upload(f, $('[name=alt]', w).value || 'bild', { maxW: img.closest('.page-head, .hero__media') ? 1920 : 1600 }).then(function (r) {
          working(false);
          change(function () {
            var oldAlt = altGet(getP(C.data, path));
            setP(C.data, path, r.path);
            if (/\.image$/.test(path)) setP(C.data, path.replace(/\.image$/, '.ratio'), r.ratio);
            if (oldAlt) altSet(r.path, oldAlt);
          });
          stored = r.path;
          $('.kx-prev img', w).src = S.imageUrl(r.path);
          toast('Bild ersetzt');
        }).catch(function (e) { working(false); toast(e && e.message === 'format' ? 'Dieses Bildformat wird nicht unterstützt. Bitte ein JPG oder PNG wählen.' : 'Das Bild konnte nicht geladen werden.', 5000); });
      };
    });
    $('[data-a=ok]', w).onclick = function () {
      var v = $('[name=alt]', w).value.trim();
      if (v !== altGet(stored)) change(function () { altSet(stored, v); });
      closeSheet();
    };
    var del = $('[data-a=del]', w);
    if (del) del.onclick = function () { closeSheet(); change(function () { getP(C.data, inList.list).splice(inList.i, 1); }); toast('Bild gelöscht'); };
  }

  /* ------------------------------------------------------------ Videos (Startseite, Projekt-Rundgang, Film DRP Architecture) */
  function itemIdx() { var id = A.param('id'), i = -1; (C.data.items || []).forEach(function (x, k) { if (x.id === id) i = k; }); return i; }
  function videoSpec(el) {
    if (el.closest('.arch-film-v')) return { title: 'Film DRP Architecture', mp4: 'architecture.film.mp4', webm: 'architecture.film.webm', poster: 'architecture.film.poster' };
    var i = itemIdx();
    if (el.closest('#g-main') && i > -1) return { title: 'Video zum Projekt', mp4: 'items.' + i + '.video', poster: 'items.' + i + '.video_poster' };
    return null;
  }
  var HERO_VIDEO = { title: 'Video auf der Startseite', mp4: 'site.hero_video_mp4', webm: 'site.hero_video_webm' };
  function heroSheet() {
    var w = sheet('Startseite oben', '<div class="kx-list">' +
      '<button class="kx-li" data-h="img">🖼 Foto ändern</button><button class="kx-li" data-h="vid">🎬 Video ändern oder entfernen</button></div>' +
      '<p class="kx-hint" style="margin-top:12px!important">Das Video (Tag ↔ Nacht) liegt über dem Foto. Ein neues Foto ohne neues Video wird allein gezeigt.</p>', { noFocus: true });
    $('[data-h=img]', w).onclick = function () { closeSheet(); imageSheet($('.hero__media img')); };
    $('[data-h=vid]', w).onclick = function () { closeSheet(); videoSheet(HERO_VIDEO); };
  }
  function posterFrom(file) { // erstes Bild des Videos als Vorschaubild
    return new Promise(function (res) {
      var v = document.createElement('video'), url = URL.createObjectURL(file), done = false;
      var finish = function (b) { if (done) return; done = true; URL.revokeObjectURL(url); res(b); };
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      v.addEventListener('loadeddata', function () { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); });
      v.addEventListener('seeked', function () {
        try {
          var cv = document.createElement('canvas'), sc = Math.min(1, 1600 / v.videoWidth);
          cv.width = Math.round(v.videoWidth * sc); cv.height = Math.round(v.videoHeight * sc);
          cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) { finish(b); }, 'image/jpeg', 0.82);
        } catch (e) { finish(null); }
      });
      v.addEventListener('error', function () { finish(null); });
      setTimeout(function () { finish(null); }, 8000);
    });
  }
  function videoSheet(spec) {
    var cur = getP(C.data, spec.mp4);
    var w = sheet(spec.title, '<div class="kx-form"><div class="kx-prev">' + (cur ? '<video src="' + esc(S.imageUrl(cur)) + '" muted controls playsinline style="max-width:100%;max-height:260px"></video>' : '<p class="kx-hint">Noch kein Video.</p>') + '</div>' +
      '<div class="kx-row kx-pick"><label class="kx-btn kx-primary">📁 Video aus Galerie<input type="file" accept="video/mp4,video/webm,video/quicktime,video/*" hidden></label>' +
      '<label class="kx-btn kx-primary">🎥 Video aufnehmen<input type="file" accept="video/*" capture="environment" hidden></label></div>' +
      '<p class="kx-hint">Am besten kurze Clips (unter 50 MB, MP4). Das Video wird nicht verkleinert; es läuft stumm und in Schleife.</p>' +
      '<div class="kx-row">' + (cur ? '<button class="kx-btn kx-ghost kx-red" data-a="del">Video entfernen</button>' : '') + '<button class="kx-btn kx-primary" data-a="ok">Fertig</button></div></div>', { noFocus: true });
    $$('input[type=file]', w).forEach(function (inp) {
      inp.onchange = function () {
        var f = inp.files[0]; if (!f) return;
        var go = function () {
          working(true);
          var ext = (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
          Promise.all([S.uploadImage(f, slug(spec.title) + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext), spec.poster ? posterFrom(f) : null]).then(function (r) {
            return (r[1] ? S.uploadImage(r[1], slug(spec.title) + '-vorschau-' + Math.random().toString(36).slice(2, 7) + '.jpg') : Promise.resolve(null)).then(function (pp) { return [r[0], pp]; });
          }).then(function (r) {
            working(false);
            change(function () { setP(C.data, spec.mp4, r[0]); if (spec.webm) setP(C.data, spec.webm, null); if (spec.poster && r[1]) setP(C.data, spec.poster, r[1]); });
            closeSheet(); toast('Video ersetzt');
          }).catch(function () { working(false); toast('Das Video konnte nicht gespeichert werden (zu groß für den Browser-Speicher?).', 6000); });
        };
        if (f.size > 80 * 1024 * 1024) confirmBox('Großes Video', 'Das Video ist ' + Math.round(f.size / 1048576) + ' MB groß und lädt für Besucher langsam. Trotzdem verwenden?', 'Trotzdem verwenden').then(function (ok) { if (ok) go(); });
        else go();
      };
    });
    $('[data-a=ok]', w).onclick = closeSheet;
    var del = $('[data-a=del]', w);
    if (del) del.onclick = function () { closeSheet(); change(function () { setP(C.data, spec.mp4, null); if (spec.webm) setP(C.data, spec.webm, null); }); toast('Video entfernt'); };
  }

  /* Foto dort hinzufügen, wo noch ein Platzhalter steht (neue Person, neues Objekt) */
  function addPhoto(phEl) {
    var b = blockOf(phEl);
    if (b && b.list === 'team') { photoSheet('team.' + b.i + '.photo', C.data.team[b.i].nom); return true; }
    var i = b && b.list === 'items' ? b.i : (phEl.closest('.gallery') ? itemIdx() : -1);
    if (i > -1) { galleryManager('items.' + i + '.images', C.data.items[i].titre); return true; }
    if (A.page === 'membre') { var id = A.param('id'), k = -1; C.data.team.forEach(function (m, x) { if (m.id === id) k = x; }); if (k > -1) { photoSheet('team.' + k + '.photo', C.data.team[k].nom); return true; } }
    return false;
  }
  function photoSheet(path, title) {
    var w = sheet('Foto hinzufügen', '<div class="kx-form"><p class="kx-hint">Für „' + esc(strip(title || '')) + '“ ist noch kein Foto da.</p>' + pickers(false) + '</div>', { noFocus: true });
    $$('input[type=file]', w).forEach(function (inp) {
      inp.onchange = function () {
        var f = inp.files[0]; if (!f) return; working(true);
        upload(f, title || 'foto', { maxW: 1200 }).then(function (r) { working(false); closeSheet(); change(function () { setP(C.data, path, r.path); }); toast('Foto hinzugefügt'); })
          .catch(function () { working(false); toast('Das Bild konnte nicht geladen werden.', 5000); });
      };
    });
  }

  /* ------------------------------------------------------------ Bilder verwalten (Galerie eines Objekts, Fotowand) */
  function galleryManager(listPath, title) {
    var w = sheet('Bilder verwalten', '<div></div>', { wide: true, noFocus: true });
    function src(e) { return typeof e === 'string' ? e : e.image; }
    function draw() {
      var list = getP(C.data, listPath) || [];
      var html = '<p class="kx-hint">Reihenfolge mit ← → ändern. Das erste Bild erscheint in Übersichten und auf der Karte. Beschreibung hilft bei Google.</p><div class="kx-gal">' + list.map(function (e, i) {
        return '<div class="kx-gi" data-i="' + i + '"><img src="' + esc(S.imageUrl(src(e))) + '" alt=""><input data-alt="' + i + '" value="' + esc(altGet(src(e))) + '" placeholder="Bildbeschreibung">' +
          '<div class="kx-gb"><button data-m="-1" aria-label="Nach vorne">←</button><button data-m="1" aria-label="Nach hinten">→</button><button data-d aria-label="Löschen" class="kx-red">🗑</button></div></div>';
      }).join('') + '</div>' + pickers(true) + '<button class="kx-btn kx-ghost kx-block" data-a="ok">Fertig</button>';
      var body = $('.kx-sheet-body', w);
      body.innerHTML = ''; body.appendChild(frag(html));
      $$('[data-m]', body).forEach(function (b) {
        b.onclick = function () {
          var i = +b.closest('.kx-gi').getAttribute('data-i'), j = i + (+b.getAttribute('data-m'));
          if (j < 0 || j >= list.length) return;
          change(function () { var a = getP(C.data, listPath); var x = a.splice(i, 1)[0]; a.splice(j, 0, x); }); draw();
        };
      });
      $$('[data-d]', body).forEach(function (b) {
        b.onclick = function () { var i = +b.closest('.kx-gi').getAttribute('data-i'); change(function () { getP(C.data, listPath).splice(i, 1); }); draw(); };
      });
      $$('[data-alt]', body).forEach(function (inp) {
        inp.onchange = function () { var e = list[+inp.getAttribute('data-alt')]; change(function () { altSet(src(e), inp.value.trim()); }); };
      });
      $$('input[type=file]', body).forEach(function (inp) {
        inp.onchange = function () {
          var files = Array.prototype.slice.call(inp.files); if (!files.length) return;
          working(true);
          Promise.all(files.map(function (f) { return upload(f, title, { maxW: 1600 }); })).then(function (rs) {
            working(false);
            change(function () {
              var a = getP(C.data, listPath);
              rs.forEach(function (r) { a.push(/photos$/.test(listPath) ? { image: r.path, ratio: r.ratio } : r.path); });
            });
            draw(); toast(rs.length + (rs.length === 1 ? ' Bild' : ' Bilder') + ' hinzugefügt');
          }).catch(function () { working(false); toast('Mindestens ein Bild konnte nicht geladen werden.', 5000); });
        };
      });
      $('[data-a=ok]', body).onclick = closeSheet;
    }
    draw();
  }

  /* ------------------------------------------------------------ Knöpfe auf der Seite (nur im Bearbeiten-Modus) */
  function chip(host, label, fn, extra) {
    if (!host || $(':scope > .kx-chip', host)) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var b = document.createElement('button');
    b.className = 'kx-chip ' + (extra || ''); b.type = 'button'; b.innerHTML = esc(label);
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
    host.appendChild(b);
  }
  function chips() {
    var id = A.param('id');
    if (A.page === 'datenschutz') legalEditable();
    if ((A.page === 'bien' || A.page === 'projet') && id) {
      var i = itemIndexByHref('?id=' + encodeURIComponent(id));
      if (i > -1) {
        var g = $('.gallery__main') || $('#main section, #main .wrap');
        chip(g, '🖼 Bilder verwalten (' + C.data.items[i].images.length + ')', function () { galleryManager('items.' + i + '.images', C.data.items[i].titre); }, 'kx-chip-gal');
        chip($('#main h1') && $('#main h1').parentElement, '✎ Angaben zu diesem Objekt', function () { itemSheet(i); });
        if (A.page === 'projet') chip($('.gallery') || g, '🎬 ' + (C.data.items[i].video ? 'Video ändern' : 'Video hinzufügen'), function () { videoSheet({ title: 'Video zum Projekt', mp4: 'items.' + i + '.video', poster: 'items.' + i + '.video_poster' }); }, 'kx-chip-top');
      }
    }
    if (A.page === 'membre' && id) {
      C.data.team.forEach(function (m, i) { if (m.id === id) chip($('#main h1') && $('#main h1').parentElement, '✎ Angaben zu dieser Person', function () { teamSheet(i); }); });
    }
    var wall = $('.arch-wall');
    if (wall) chip(wall.parentElement, '🖼 Bilder verwalten (' + C.data.architecture.photos.length + ')', function () { galleryManager('architecture.photos', 'DRP Architecture'); }, 'kx-chip-top');
  }

  /* ------------------------------------------------------------ Angaben zu Objekt / Person */
  var STATUS = ['a-vendre', 'a-louer', 'vendu', 'loue', 'en-cours', 'realise'];
  var CATS = ['appartement', 'maison', 'penthouse', 'residence', 'maisons'];
  function field(label, name, val, type, hint) {
    return '<label>' + label + (hint ? ' <small>' + hint + '</small>' : '') + (type === 'area'
      ? '<textarea name="' + name + '" rows="6">' + esc(val == null ? '' : val) + '</textarea>'
      : '<input name="' + name + '" value="' + esc(val == null ? '' : val) + '"' + (type === 'num' ? ' inputmode="decimal"' : '') + '>') + '</label>';
  }
  function itemSheet(i) {
    var it = C.data.items[i], l = lang(), desc = it.description || {};
    var w = sheet(it.type === 'projet' ? 'Projekt – Angaben' : 'Immobilie – Angaben', '<form class="kx-form">' +
      field('Titel', 'titre', it.titre) +
      '<label>Ort<input name="localite" list="kx-places" autocomplete="off" value="' + esc(it.localite || '') + '"></label><datalist id="kx-places"></datalist>' +
      field('Gemeinde', 'gemeinde', it.gemeinde) +
      '<label>Stand<select name="statut">' + STATUS.map(function (s) { return '<option value="' + s + '"' + (s === it.statut ? ' selected' : '') + '>' + esc(strip(A.t('status.' + s))) + '</option>'; }).join('') + '</select></label>' +
      '<label>Art<select name="categorie">' + CATS.map(function (c) { return '<option value="' + c + '"' + (c === it.categorie ? ' selected' : '') + '>' + esc(strip(A.t('cat.' + c))) + '</option>'; }).join('') + '</select></label>' +
      '<label>Unternehmen<select name="bereich">' + [['luxembourg', 'DRP Luxembourg (Agentur)'], ['real-estate', 'DRP Real Estate (eigene Projekte)']].map(function (b) { return '<option value="' + b[0] + '"' + (b[0] === it.bereich ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('') + '</select></label>' +
      (it.type === 'bien' ? field('Preis in €', 'prix', it.prix, 'num', 'leer = „Preis auf Anfrage“; bei „Zu vermieten“ die Monatsmiete') +
        '<label class="kx-check"><input type="checkbox" name="tva3"' + (it.prix_tva3 ? ' checked' : '') + '> Preis inkl. 3 % MwSt.</label>' +
        field('Wohnfläche in m²', 'surface', it.surface, 'num') +
        '<label>Gehört zu Projekt<select name="projet"><option value="">– kein Projekt –</option>' + C.data.items.filter(function (x) { return x.type === 'projet'; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === it.projet ? ' selected' : '') + '>' + esc(strip(x.titre)) + '</option>'; }).join('') + '</select></label>'
        : field('Anzahl Einheiten', 'unites_total', it.unites_total, 'num') + field('Verkauft (z. B. 5/6)', 'vente', it.vente) +
          field('Flächen als Spanne (z. B. 90–150)', 'surface_texte', it.surface_texte) +
          field('Einheiten (eine pro Zeile)', 'unites', (it.unites || []).join('\n'), 'area')) +
      field('Schlafzimmer', 'chambres', it.chambres, '', 'z. B. 3 oder 2–3') +
      '<label>Verfügbar<select name="dispo"><option value="now"' + (it.disponibilite === 'now' ? ' selected' : '') + '>Sofort</option><option value="tbd"' + (!it.disponibilite || it.disponibilite === 'tbd' ? ' selected' : '') + '>Wird bestätigt</option>' +
        '<option value="date"' + (it.disponibilite && it.disponibilite !== 'now' && it.disponibilite !== 'tbd' ? ' selected' : '') + '>Ab Datum / Zeitraum …</option></select></label>' +
      field('Datum oder Zeitraum', 'dispo_date', it.disponibilite && it.disponibilite !== 'now' && it.disponibilite !== 'tbd' ? it.disponibilite : '', '', 'z. B. 01.12.2026, 2027 oder Q1 2027') +
      field('Baujahr', 'annee', it.annee, '', 'z. B. 2012 oder Q1 2026') + field('Energieklasse', 'energie', it.energie, '', 'z. B. B / B') +
      field('Adresse', 'adresse', it.adresse, '', 'leer lassen, wenn sie nicht genannt werden soll') +
      field('Broschüre (Link zur PDF)', 'brochure', it.brochure) +
      field('Beschreibung (' + l.toUpperCase() + ')', 'desc', (desc[l] || desc.en || []).join ? (desc[l] || desc.en || []).join('\n\n') : (desc[l] || ''), 'area', 'Leerzeile = neuer Absatz') +
      '<label class="kx-check"><input type="checkbox" name="aff"' + (it.a_laffiche ? ' checked' : '') + '> Auf der Startseite unter „Im Fokus“ zeigen (höchstens 3)</label>' +
      '<div class="kx-mapbox"><span class="kx-lbl2">Position auf der Karte</span><p class="kx-hint" data-pos>Wird beim Eintippen des Ortes automatisch gesetzt (Ortsmitte). Zum Ändern den Punkt verschieben oder in die Karte tippen.</p>' +
      '<div class="kx-map"></div><div class="kx-row kx-latlng">' + field('Breite', 'lat', it.lat, 'num') + field('Länge', 'lng', it.lng, 'num') + '</div></div>' +
      '<button class="kx-btn kx-primary kx-block" type="submit">Übernehmen</button></form>');
    mapPicker(w, it);
    var dsel = $('[name=dispo]', w), dlab = $('[name=dispo_date]', w).closest('label');
    var dshow = function () { dlab.hidden = dsel.value !== 'date'; }; dsel.onchange = dshow; dshow();
    $('form', w).onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, n = function (v) { v = String(v).replace(',', '.').trim(); return v === '' ? null : +v; };
      if (f.aff.checked && !it.a_laffiche && C.data.items.filter(function (x) { return x.a_laffiche; }).length >= 3) { toast('„Im Fokus“ zeigt höchstens 3 Objekte. Bitte zuerst bei einem anderen das Häkchen entfernen.', 5000); return; }
      change(function () {
        var tx = function (v) { v = String(v).trim(); return v || null; };
        it.titre = f.titre.value.trim(); it.localite = f.localite.value.trim(); it.gemeinde = f.gemeinde.value.trim(); it.statut = f.statut.value;
        it.categorie = f.categorie.value; it.bereich = f.bereich.value;
        if (f.prix) { it.prix = n(f.prix.value); it.surface = n(f.surface.value); it.prix_tva3 = f.tva3.checked; it.projet = f.projet.value || null; }
        if (f.unites_total) { it.unites_total = n(f.unites_total.value); it.vente = tx(f.vente.value); it.surface_texte = tx(f.surface_texte.value); it.unites = f.unites.value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
        it.chambres = f.chambres.value.trim() || null;
        it.disponibilite = f.dispo.value === 'date' ? tx(f.dispo_date.value) || 'tbd' : f.dispo.value;
        it.annee = tx(f.annee.value); it.energie = tx(f.energie.value); it.adresse = tx(f.adresse.value); it.brochure = tx(f.brochure.value);
        it.description = it.description || {};
        it.description[l] = f.desc.value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        it.a_laffiche = f.aff.checked;
        if (n(f.lat.value) != null) it.lat = n(f.lat.value);
        if (n(f.lng.value) != null) it.lng = n(f.lng.value);
      });
      closeSheet(); toast('Angaben übernommen – bitte Speichern nicht vergessen');
    };
  }
  /* Orte (js/places.js, erst bei Bedarf geladen) und Karte im Formular */
  var placesP = null;
  function loadPlaces() {
    if (window.DRP_PLACES) return Promise.resolve(window.DRP_PLACES);
    return placesP || (placesP = new Promise(function (res) {
      var sc = document.createElement('script'); sc.src = 'js/places.js?v=20261029e'; sc.onload = function () { res(window.DRP_PLACES || []); }; sc.onerror = function () { res([]); };
      document.head.appendChild(sc);
    }));
  }
  function norm(x) { return String(x || '').replace(STRIP, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function findPlace(list, name) {
    var n = norm(name); if (!n) return null;
    return list.filter(function (p) { return p[0].split('|').some(function (x) { return norm(x) === n; }); }).sort(function (a, b) { return a[3] - b[3]; })[0] || null;
  }
  function mapPicker(w, it) {
    var f = $('form', w), lat = f.lat, lng = f.lng, info = $('[data-pos]', w), map = null, marker = null, places = [];
    function num(v) { v = parseFloat(String(v).replace(',', '.')); return isNaN(v) ? null : v; }
    function setPos(a, b, msg, pan) {
      lat.value = a.toFixed(5); lng.value = b.toFixed(5);
      if (marker) { marker.setLatLng([a, b]); if (pan !== false) map.setView([a, b], Math.max(map.getZoom(), 13)); }
      if (msg) info.textContent = msg;
    }
    loadPlaces().then(function (list) {
      places = list;
      $('#kx-places', w).innerHTML = list.filter(function (p) { return p[3] <= 4; }).map(function (p) { return '<option value="' + esc(p[0].split('|')[0]) + '">'; }).join('');
    });
    var t = null;
    function lookup() {
      clearTimeout(t);
      t = setTimeout(function () {
        var p = f.localite.value.trim() ? findPlace(places, f.localite.value) : findPlace(places, f.gemeinde.value); // Gemeinde nur, wenn kein Ort eingetragen
        if (p) setPos(p[1], p[2], 'Ortsmitte von „' + p[0].split('|')[0] + '“ übernommen. Zum Ändern den Punkt verschieben oder in die Karte tippen.');
        else if (f.localite.value.trim()) info.textContent = 'Ort nicht gefunden – bitte Schreibweise prüfen oder die Position in der Karte antippen.';
      }, 250);
    }
    f.localite.addEventListener('input', lookup);
    f.gemeinde.addEventListener('change', function () { if (!findPlace(places, f.localite.value)) lookup(); });
    [lat, lng].forEach(function (inp) { inp.addEventListener('change', function () { var a = num(lat.value), b = num(lng.value); if (a != null && b != null && marker) { marker.setLatLng([a, b]); map.panTo([a, b]); } }); });
    A.loadLeaflet().then(function (L) {
      var el = $('.kx-map', w); if (!el || !document.body.contains(el)) return;
      var a = num(lat.value) || 49.61, b = num(lng.value) || 6.13;
      map = A.baseMap(L, el, { scrollWheelZoom: true });
      map.setView([a, b], num(lat.value) ? 13 : 9);
      marker = L.marker([a, b], { draggable: true, icon: A.markerIcon(L, [it]), keyboard: false }).addTo(map);
      marker.on('dragend', function () { var p = marker.getLatLng(); setPos(p.lat, p.lng, 'Position von Hand gesetzt.', false); });
      map.on('click', function (e) { setPos(e.latlng.lat, e.latlng.lng, 'Position von Hand gesetzt.', false); });
      setTimeout(function () { if (document.body.contains(el)) map.invalidateSize(); }, 50); // Formular evtl. schon zu
    });
  }
  function teamSheet(i) {
    var m = C.data.team[i], l = lang(), bio = m.bio || {};
    var w = sheet('Person – Angaben', '<form class="kx-form">' + field('Name', 'nom', m.nom) + field('Funktion', 'role', m.role) +
      '<label>Gruppe<select name="groupe"><option value="associes"' + (m.groupe === 'associes' ? ' selected' : '') + '>Partner (oben)</option><option value="equipe"' + (m.groupe !== 'associes' ? ' selected' : '') + '>Team</option></select></label>' +
      field('E-Mail', 'email', m.email) + field('Telefon', 'tel', m.tel) +
      field('Link beim Antippen der Person', 'url', m.url, '', '„/team/name/“ = eigene Profilseite, sonst volle Adresse (z. B. https://…)') +
      field('Text auf der Profilseite (' + l.toUpperCase() + ')', 'bio', (bio[l] || bio.en || []).join ? (bio[l] || bio.en || []).join('\n\n') : '', 'area', 'Leerzeile = neuer Absatz') +
      '<button class="kx-btn kx-primary kx-block" type="submit">Übernehmen</button></form>');
    $('form', w).onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      change(function () {
        m.nom = f.nom.value.trim(); m.role = f.role.value.trim(); m.groupe = f.groupe.value;
        m.email = f.email.value.trim() || undefined; m.tel = f.tel.value.trim() || undefined; m.url = f.url.value.trim() || m.url;
        m.bio = m.bio || {}; m.bio[l] = f.bio.value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      });
      closeSheet(); toast('Angaben übernommen – bitte Speichern nicht vergessen');
    };
  }

  /* ------------------------------------------------------------ Alle Texte dieser Seite (auch Knöpfe, Auswahllisten, Platzhalter, Fehlermeldungen) */
  function rawText(key) {
    var get = function (d) { return key.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, d); };
    var v = get(window.DRP_I18N[lang()]); if (v === undefined) v = get(window.DRP_I18N.en);
    return typeof v === 'string' ? v : null;
  }
  function textsSheet() {
    commitEditing();
    var keys = Object.keys(window.DRP_USED || {}).filter(function (k) { return rawText(k) !== null; });
    var w = sheet('Alle Texte dieser Seite (' + lang().toUpperCase() + ')', '<div class="kx-form">' +
      '<p class="kx-hint">Hier stehen alle Texte dieser Seite, auch Knöpfe, Auswahllisten, Hinweise im leeren Feld und Fehlermeldungen. Sie gelten für die oben gewählte Sprache. Zeichen in geschweiften Klammern wie {n} bitte stehen lassen – dort setzt die Seite eine Zahl oder einen Namen ein.</p>' +
      '<input class="kx-search" type="search" placeholder="Suchen …" aria-label="Texte durchsuchen">' +
      '<div class="kx-texts">' + keys.map(function (k, i) {
        var v = rawText(k), long = v.length > 70;
        return '<label class="kx-tx" data-k="' + esc(k) + '"><small>' + esc(k) + '</small>' + (long ? '<textarea rows="3" data-i="' + i + '">' + esc(v) + '</textarea>' : '<input data-i="' + i + '" value="' + esc(v) + '">') + '</label>';
      }).join('') + '</div><button class="kx-btn kx-primary kx-block" data-a="ok">Übernehmen</button></div>', { wide: true, noFocus: true });
    $('.kx-search', w).oninput = function () {
      var q = this.value.toLowerCase();
      $$('.kx-tx', w).forEach(function (l) { l.hidden = q && (l.textContent + ' ' + $('input,textarea', l).value).toLowerCase().indexOf(q) < 0; });
    };
    $('[data-a=ok]', w).onclick = function () {
      var changes = [];
      $$('[data-i]', w).forEach(function (f) { var k = keys[+f.getAttribute('data-i')]; if (f.value !== rawText(k)) changes.push([k, f.value]); });
      closeSheet();
      if (!changes.length) return;
      change(function () { C.i18n[lang()] = C.i18n[lang()] || {}; changes.forEach(function (x) { C.i18n[lang()][x[0]] = x[1]; }); });
      toast(changes.length + (changes.length === 1 ? ' Text geändert' : ' Texte geändert') + ' – bitte Speichern nicht vergessen');
    };
  }
  /* Firmendaten: Adresse, Telefon, E-Mail, soziale Netzwerke – erscheinen in Kontakt und Footer */
  function companySheet() {
    var s0 = C.data.site;
    var w = sheet('Firmendaten', '<form class="kx-form"><p class="kx-hint">Diese Angaben stehen im Footer, auf der Kontaktseite und in der mobilen Leiste („Anrufen“).</p>' +
      field('Firmenname', 'societe', s0.societe) +
      field('Adresse', 'adresse', (s0.adresse || []).join('\n'), 'area', 'eine Zeile pro Zeile der Anschrift') +
      field('Zusatz unter der Adresse', 'note', s0.adresse_note) +
      field('Telefonnummern', 'tel', (s0.telephones || []).map(function (x) { return x.label; }).join('\n'), 'area', 'eine Nummer pro Zeile; die erste wählt der Knopf „Anrufen“') +
      field('E-Mail', 'email', s0.email) + field('LinkedIn (Adresse)', 'linkedin', s0.linkedin) + field('Instagram (Adresse)', 'instagram', s0.instagram) +
      '<button class="kx-btn kx-primary kx-block" type="submit">Übernehmen</button></form>');
    $('form', w).onsubmit = function (e) {
      e.preventDefault(); var f = e.target, lines = function (v) { return v.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); };
      change(function () {
        s0.societe = f.societe.value.trim(); s0.adresse = lines(f.adresse.value); s0.adresse_note = f.note.value.trim() || null;
        s0.telephones = lines(f.tel.value).map(function (l) { var d = l.replace(/[^\d+]/g, ''); return { label: l, href: 'tel:' + (d.charAt(0) === '+' ? d : '+352' + d) }; });
        s0.email = f.email.value.trim(); s0.linkedin = f.linkedin.value.trim(); s0.instagram = f.instagram.value.trim();
      });
      closeSheet(); toast('Firmendaten übernommen – bitte Speichern nicht vergessen');
    };
  }
  /* Vorher/Nachher (DRP Real Estate): erscheint, sobald beide Fotos da sind */
  function baSheet() {
    C.data.avant_apres = C.data.avant_apres && C.data.avant_apres.length ? C.data.avant_apres : [{ titre: null, avant: null, apres: null, projet: null }];
    var o = C.data.avant_apres[0];
    var slot = function (k, label) { return '<div class="kx-ba"><span class="kx-lbl2">' + label + '</span><div class="kx-prev">' + (o[k] ? '<img src="' + esc(S.imageUrl(o[k])) + '" alt="">' : '<p class="kx-hint">Noch kein Foto</p>') + '</div>' +
      '<div class="kx-row kx-pick"><label class="kx-btn kx-primary">📁 Foto aus Galerie<input type="file" accept="image/*" hidden data-k="' + k + '"></label><label class="kx-btn kx-primary">📷 Foto aufnehmen<input type="file" accept="image/*" capture="environment" hidden data-k="' + k + '"></label></div>' +
      (o[k] ? '<button class="kx-btn kx-ghost kx-red" data-del="' + k + '">Foto entfernen</button>' : '') + '</div>'; };
    var w = sheet('Vorher / Nachher', '<div class="kx-form"><p class="kx-hint">Zwei Fotos derselben Stelle – vor und nach der Renovierung. Der Regler erscheint auf „DRP Real Estate“, sobald beide Fotos da sind.</p>' +
      slot('avant', 'Vorher') + slot('apres', 'Nachher') + '<button class="kx-btn kx-primary kx-block" data-a="ok">Fertig</button></div>', { noFocus: true });
    $$('input[type=file]', w).forEach(function (inp) {
      inp.onchange = function () {
        var f = inp.files[0], k = inp.getAttribute('data-k'); if (!f) return; working(true);
        upload(f, 'vorher-nachher-' + k, { maxW: 1600 }).then(function (r) { working(false); change(function () { o[k] = r.path; }); baSheet(); })
          .catch(function () { working(false); toast('Das Bild konnte nicht geladen werden.', 5000); });
      };
    });
    $$('[data-del]', w).forEach(function (b) { b.onclick = function () { change(function () { o[b.getAttribute('data-del')] = null; }); baSheet(); }; });
    $('[data-a=ok]', w).onclick = closeSheet;
  }
  /* Datenschutztext direkt auf der Seite bearbeiten (Überschriften, Absätze, Listen, Links bleiben erhalten) */
  function legalEditable() {
    var el = $('.legal .prose'); if (!el || el.isContentEditable) return;
    el.contentEditable = 'true'; el.classList.add('kx-rich');
    el.addEventListener('focus', function () { el._before = el.innerHTML; });
    el.addEventListener('blur', function () {
      if (el.innerHTML === el._before) return;
      var box = document.createElement('div'); box.innerHTML = el.innerHTML;
      $$('*', box).forEach(function (n) {
        if (!/^(H2|H3|P|UL|OL|LI|STRONG|EM|BR|A)$/.test(n.tagName)) { n.replaceWith.apply(n, Array.prototype.slice.call(n.childNodes)); return; }
        Array.prototype.slice.call(n.attributes).forEach(function (at) { if (!(n.tagName === 'A' && at.name === 'href')) n.removeAttribute(at.name); });
      });
      var html = box.innerHTML;
      change(function () { C.legal = html; }, false);
      el._before = el.innerHTML;
    });
  }

  /* ------------------------------------------------------------ Seiten, Google, Mehr */
  var PAGES = [['index.html', 'Startseite'], ['biens.html', 'Immobilien'], ['projets.html', 'Projekte'], ['carte.html', 'Karte'], ['durabilite.html', 'Nachhaltigkeit'],
    ['about.html', 'Über uns'], ['team.html', 'Team'], ['contact.html', 'Kontakt'], ['datenschutz.html', 'Datenschutz'], ['estimation.html', 'Kostenlose Bewertung'],
    ['drp-luxembourg.html', 'DRP Luxembourg'], ['drp-real-estate.html', 'DRP Real Estate'], ['drp-senses.html', 'DRP Senses'], ['drp-architecture.html', 'DRP Architecture'], ['merkliste.html', 'Merkliste']];
  function go(href) {
    if (!dirty) { location.href = href; return; }
    confirmBox('Ungespeicherte Änderungen', 'Vor dem Wechsel speichern?', 'Speichern und öffnen', false, 'Ohne Speichern').then(function (ok) {
      if (ok === null) return;
      if (ok) save().then(function () { location.href = href; }); else { dirty = false; location.href = href; }
    });
  }
  function pagesSheet() {
    commitEditing();
    var here = location.pathname.split('/').pop() + location.search;
    var li = function (href, label, del) {
      var gone = !/\?/.test(href) && A.isHidden(href);
      return '<div class="kx-lirow' + (gone ? ' kx-gone' : '') + '"><button class="kx-li' + (here === href || (here === '' && href === 'index.html') ? ' kx-cur' : '') + '" data-p="' + esc(href) + '">' + esc(strip(label)) + (gone ? ' <small>(gelöscht)</small>' : '') + '</button>' +
        (del ? '<button class="kx-li kx-del' + (gone ? '' : ' kx-red') + '" ' + del + ' aria-label="' + (gone ? 'Wiederherstellen' : 'Löschen') + ': ' + esc(strip(label)) + '">' + (gone ? '↺' : '🗑') + '</button>' : '') + '</div>';
    };
    var items = function (type) { return C.data.items.filter(function (x) { return x.type === type; }).map(function (x) { return li(A.url(x), x.titre, 'data-di="' + esc(x.id) + '"'); }).join(''); };
    var html = '<h3 class="kx-h3">Seiten</h3><div class="kx-list">' + PAGES.map(function (p) { return li(p[0], p[1], LOCKED.indexOf(p[0]) < 0 ? 'data-dp="' + p[0] + '"' : ''); }).join('') + '</div>' +
      '<h3 class="kx-h3">Projekte</h3><div class="kx-list">' + items('projet') + '</div>' +
      '<h3 class="kx-h3">Immobilien</h3><div class="kx-list">' + items('bien') + '</div>' +
      '<div class="kx-row" style="margin-top:12px"><button class="kx-btn kx-ghost" data-n="bien">+ Neue Immobilie</button><button class="kx-btn kx-ghost" data-n="projet">+ Neues Projekt</button></div>' +
      '<button class="kx-btn kx-ghost kx-block" data-trash style="margin-top:10px">🗑 Papierkorb – Gelöschtes wiederherstellen (' + trashCount() + ')</button>';
    var w = sheet('Seite öffnen', html, { noFocus: true });
    $$('[data-p]', w).forEach(function (b) { b.onclick = function () { closeSheet(); go(b.getAttribute('data-p')); }; });
    $$('[data-n]', w).forEach(function (b) { b.onclick = function () { newItemSheet(b.getAttribute('data-n')); }; });
    $$('[data-dp]', w).forEach(function (b) { b.onclick = function () { togglePage(b.getAttribute('data-dp')); }; });
    $('[data-trash]', w).onclick = trashSheet;
    $$('[data-di]', w).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-di'), here = A.param('id') === id, it = C.data.items.filter(function (x) { return x.id === id; })[0];
        deleteItem(id, here ? function () { location.href = it.type === 'projet' ? 'projets.html' : 'biens.html'; } : null);
      };
    });
  }
  function seoSheet() {
    commitEditing();
    var l = lang(), key = pageKey(), cur = (C.seo[l] && C.seo[l][key]) || {};
    var md = $('meta[name="description"]');
    var imgs = [], seen = {};
    $$('#main img, .hero__media img').forEach(function (im) { var p = imagePath(im); if (!p) return; var v = getP(C.data, p); if (!seen[v]) { seen[v] = 1; imgs.push(v); } });
    var w = sheet('Google – diese Seite (' + l.toUpperCase() + ')', '<div class="kx-form">' +
      '<p class="kx-hint">Gilt für diese Seite in der gerade gewählten Sprache. Für eine andere Sprache oben auf der Seite die Sprache wechseln.</p>' +
      '<div class="kx-serp"><div class="kx-serp-url">' + esc(window.SITE_CONFIG.siteUrl.replace(/^https?:\/\//, '') + '/' + location.pathname.split('/').pop()) + '</div><div class="kx-serp-t"></div><div class="kx-serp-d"></div></div>' +
      '<label>Titel bei Google <small data-c="t"></small><input name="t" value="' + esc(cur.title || strip(document.title)) + '"></label>' +
      '<label>Beschreibung bei Google <small data-c="d"></small><textarea name="d" rows="3">' + esc(cur.description || (md ? md.content : '')) + '</textarea></label>' +
      '<h3 class="kx-h3">Bildbeschreibungen auf dieser Seite</h3><div class="kx-alts">' +
      (imgs.length ? imgs.map(function (p, i) { return '<div class="kx-alt"><img src="' + esc(S.imageUrl(p)) + '" alt=""><input data-ai="' + i + '" value="' + esc(altGet(p)) + '" placeholder="Was ist auf dem Bild zu sehen?"></div>'; }).join('') : '<p class="kx-hint">Keine Bilder auf dieser Seite.</p>') +
      '</div><button class="kx-btn kx-primary kx-block" data-a="ok">Übernehmen</button></div>', { wide: true, noFocus: true });
    function upd() {
      var t = $('[name=t]', w).value, d = $('[name=d]', w).value;
      $('.kx-serp-t', w).textContent = t; $('.kx-serp-d', w).textContent = d;
      $('[data-c=t]', w).textContent = t.length + '/60' + (t.length > 60 ? ' – etwas lang' : '');
      $('[data-c=d]', w).textContent = d.length + '/160' + (d.length > 160 ? ' – etwas lang' : '');
    }
    $('[name=t]', w).oninput = upd; $('[name=d]', w).oninput = upd; upd();
    $('[data-a=ok]', w).onclick = function () {
      change(function () {
        C.seo[l] = C.seo[l] || {};
        C.seo[l][key] = { title: $('[name=t]', w).value.trim(), description: $('[name=d]', w).value.trim() };
        $$('[data-ai]', w).forEach(function (inp) { altSet(imgs[+inp.getAttribute('data-ai')], inp.value.trim()); });
      });
      closeSheet(); toast('Angaben für Google übernommen – bitte Speichern nicht vergessen');
    };
  }
  function deleteItem(id, after) {
    var i = -1; C.data.items.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i < 0) return;
    var it = C.data.items[i], kids = C.data.items.filter(function (x) { return x.projet === id; }).length;
    confirmBox((it.type === 'projet' ? 'Projekt' : 'Immobilie') + ' löschen', '„' + esc(strip(it.titre)) + '“ und die zugehörige Seite werden gelöscht.' +
      (kids ? ' Die ' + kids + ' zugehörigen Wohnungen bleiben als einzelne Immobilien bestehen.' : '') + ' Es kommt in den Papierkorb (unter „Mehr“ und „Seiten“) und lässt sich dort wiederherstellen.', 'Löschen', true).then(function (ok) {
      if (!ok) return;
      sel = null;
      change(function () {
        var kidIds = C.data.items.filter(function (x) { return x.projet === id; }).map(function (x) { return x.id; });
        C.trash.unshift({ kind: 'item', obj: C.data.items.splice(i, 1)[0], index: i, kids: kidIds, at: Date.now() });
        C.data.items.forEach(function (x) { if (x.projet === id) x.projet = null; });
      }, !after);
      showCtx();
      if (after) save().then(after);
    });
  }
  /* Papierkorb: gelöschte Projekte, Immobilien, Personen und Seiten – wiederherstellen oder endgültig löschen */
  var KIND = { item: function (o) { return o.type === 'projet' ? 'Projekt' : 'Immobilie'; }, team: function () { return 'Person'; } };
  function trashCount() { return C.trash.length + (C.data.site.hidden_pages || []).length; }
  function trashHtml() {
    var date = function (t) { var d = new Date(t); return d.toLocaleDateString('de-LU') + ' ' + d.toLocaleTimeString('de-LU', { hour: '2-digit', minute: '2-digit' }); };
    var rows = (C.data.site.hidden_pages || []).map(function (f) {
      var name = (PAGES.filter(function (p) { return p[0] === f; })[0] || [f, f])[1];
      return '<div class="kx-trow"><div><b>' + esc(name) + '</b><small>Seite</small></div><button class="kx-btn kx-primary" data-rp="' + esc(f) + '">↺ Wiederherstellen</button></div>';
    }).concat(C.trash.map(function (t, k) {
      return '<div class="kx-trow"><div><b>' + esc(strip(t.obj.titre || t.obj.nom || '')) + '</b><small>' + KIND[t.kind](t.obj) + ' · gelöscht am ' + date(t.at) + '</small></div>' +
        '<button class="kx-btn kx-primary" data-rt="' + k + '">↺ Wiederherstellen</button><button class="kx-btn kx-ghost kx-red" data-xt="' + k + '" aria-label="Endgültig löschen">🗑</button></div>';
    }));
    return rows.length ? rows.join('') : '<p class="kx-hint">Der Papierkorb ist leer.</p>';
  }
  function trashSheet() {
    commitEditing();
    var w = sheet('Papierkorb', '<div></div>', { noFocus: true });
    function draw() {
      var body = $('.kx-sheet-body', w);
      body.innerHTML = '<p class="kx-hint" style="margin-bottom:12px!important">Gelöschte Seiten, Projekte, Immobilien und Personen. „Wiederherstellen“ holt sie zurück, 🗑 löscht sie endgültig.</p><div class="kx-trash">' + trashHtml() + '</div>';
      $$('[data-rp]', body).forEach(function (b) { b.onclick = function () { var f = b.getAttribute('data-rp'), hp = C.data.site.hidden_pages; change(function () { hp.splice(hp.indexOf(f), 1); }); save(); draw(); toast('Seite wiederhergestellt'); }; });
      $$('[data-rt]', body).forEach(function (b) { b.onclick = function () { restore(+b.getAttribute('data-rt')); save(); draw(); }; });
      $$('[data-xt]', body).forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute('data-xt');
          confirmBox('Endgültig löschen', '„' + esc(strip(C.trash[k].obj.titre || C.trash[k].obj.nom)) + '“ lässt sich danach nicht mehr wiederherstellen.', 'Endgültig löschen', true).then(function (ok) {
            if (ok) { change(function () { C.trash.splice(k, 1); }, false); save(); } trashSheet();
          });
        };
      });
    }
    draw();
  }
  function restore(k) {
    var t = C.trash[k], list = t.kind === 'item' ? C.data.items : C.data.team, o = clone(t.obj), base = o.id, n = 2;
    while (list.some(function (x) { return x.id === o.id; })) o.id = base + '-' + n++; // inzwischen gleiche Adresse vergeben
    change(function () {
      list.splice(Math.min(t.index, list.length), 0, o);
      (t.kids || []).forEach(function (kid) { list.forEach(function (x) { if (x.id === kid && !x.projet) x.projet = o.id; }); });
      C.trash.splice(k, 1);
    });
    toast(KIND[t.kind](o) + ' „' + strip(o.titre || o.nom) + '“ wiederhergestellt');
  }
  var LOCKED = ['index.html', '404.html'];
  function togglePage(file) {
    var hp = C.data.site.hidden_pages = C.data.site.hidden_pages || [], gone = hp.indexOf(file) > -1;
    var name = (PAGES.filter(function (p) { return p[0] === file; })[0] || [file, file])[1];
    confirmBox(gone ? 'Seite wiederherstellen' : 'Seite löschen', gone ? '„' + esc(name) + '“ ist danach wieder sichtbar und überall verlinkt.'
      : '„' + esc(name) + '“ wird für Besucher entfernt, alle Links darauf verschwinden aus Menü und Footer. Im Papierkorb (unter „Mehr“ und „Seiten“) können Sie sie jederzeit wiederherstellen.',
      gone ? 'Wiederherstellen' : 'Löschen', !gone).then(function (ok) {
      if (!ok) return;
      change(function () { if (gone) hp.splice(hp.indexOf(file), 1); else hp.push(file); });
      var here = (location.pathname.split('/').pop() || 'index.html') === file;
      save().then(function () { toast(gone ? 'Seite wiederhergestellt' : 'Seite gelöscht'); if (here && !gone) location.href = 'index.html'; });
    });
  }
  function moreSheet() {
    commitEditing();
    var id = A.param('id'), isItem = (A.page === 'bien' || A.page === 'projet') && id;
    var file = location.pathname.split('/').pop() || 'index.html', isPage = !isItem && LOCKED.indexOf(file) < 0 && PAGES.some(function (p) { return p[0] === file; });
    var html = '<div class="kx-list">' +
      '<button class="kx-li" data-m="newb">➕ Neue Immobilie</button>' +
      '<button class="kx-li" data-m="newp">➕ Neues Projekt</button>' +
      '<button class="kx-li" data-m="newt">➕ Neue Person im Team</button>' +
      '<button class="kx-li" data-m="texts">Aa Alle Texte dieser Seite</button>' +
      '<button class="kx-li" data-m="company">🏢 Firmendaten (Adresse, Telefon, E-Mail, soziale Netzwerke)</button>' +
      (A.page === 'bereich' && document.body.dataset.bereich === 'real-estate' ? '<button class="kx-li" data-m="ba">⇆ Vorher/Nachher-Fotos</button>' : '') +
      '<button class="kx-li" data-m="trash">🗑 Papierkorb – Gelöschtes wiederherstellen (' + trashCount() + ')</button>' +
      '<button class="kx-li" data-m="help">❓ Kurzanleitung</button>' +
      (isItem ? '<button class="kx-li" data-m="resetp">↺ Dieses Objekt auf Original zurücksetzen</button><button class="kx-li kx-red" data-m="delitem">🗑 Dieses Objekt löschen</button>' : '') +
      (isPage ? '<button class="kx-li kx-red" data-m="delpage">' + (A.isHidden(file) ? '↺ Diese Seite wiederherstellen' : '🗑 Diese Seite löschen') + '</button>' : '') +
      '<button class="kx-li kx-red" data-m="reset">↺ Ganze Website auf Original zurücksetzen</button>' +
      '<button class="kx-li" data-m="logout">⎋ Abmelden</button></div>';
    var w = sheet('Mehr', html, { noFocus: true });
    $$('[data-m]', w).forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-m'); closeSheet();
        if (a === 'newb') newItemSheet('bien');
        if (a === 'newp') newItemSheet('projet');
        if (a === 'newt') newTeamSheet();
        if (a === 'help') helpSheet();
        if (a === 'trash') trashSheet();
        if (a === 'texts') textsSheet();
        if (a === 'company') companySheet();
        if (a === 'ba') baSheet();
        if (a === 'resetp') resetItem(id);
        if (a === 'delitem') { var tp = A.page === 'projet' ? 'projets.html' : 'biens.html'; deleteItem(id, function () { location.href = tp; }); }
        if (a === 'delpage') togglePage(file);
        if (a === 'reset') resetAll();
        if (a === 'logout') logout();
      };
    });
  }
  function helpSheet() {
    sheet('Kurzanleitung', '<ol class="kx-help">' +
      '<li><b>Text ändern:</b> Text antippen und lostippen. Gilt für die oben gewählte Sprache – für eine andere Sprache einfach die Sprache wechseln.</li>' +
      '<li><b>Bild ändern:</b> Bild antippen → „Foto aus Galerie“ oder „Foto aufnehmen“. Das gilt auch für das Logo.</li>' +
      '<li><b>Videos:</b> Video antippen (Startseite oben, Projekt-Rundgang, Film bei DRP Architecture) → austauschen oder entfernen.</li>' +
      '<li><b>Bilder eines Objekts oder der Fotowand:</b> Knopf „Bilder verwalten“ – hinzufügen, löschen, Reihenfolge.</li>' +
      '<li><b>Objekte und Personen:</b> Karte antippen – unten erscheinen ↑ ↓, Angaben, Kopieren, Löschen.</li>' +
      '<li><b>Neues Objekt / neue Person:</b> unter „Mehr“ oder „Seiten“. Die Kartenposition wird beim Eintippen des Ortes automatisch gesetzt.</li>' +
      '<li><b>Löschen:</b> Seiten, Projekte und Immobilien unter „Seiten“ (🗑) oder auf der Seite selbst unter „Mehr“. Alles Gelöschte liegt im <b>Papierkorb</b> (unter „Mehr“ und unten in „Seiten“) und lässt sich dort wiederherstellen.</li>' +
      '<li><b>Google:</b> Titel, Beschreibung und Bildbeschreibungen pro Seite und Sprache.</li>' +
      '<li><b>Andere Seite bearbeiten:</b> „Seiten“.</li>' +
      '<li><b>Texte, die man nicht antippen kann</b> (Knöpfe, Auswahllisten, Hinweise im leeren Feld, Fehlermeldungen): „Texte“ in der Leiste unten.</li>' +
      '<li><b>Adresse, Telefon, E-Mail:</b> „Mehr → Firmendaten“.</li>' +
      '<li><b>Fertig?</b> Auf <b>Speichern</b> tippen. Vertippt? <b>Rückgängig</b>.</li></ol>', { noFocus: true });
  }
  function newItemSheet(type) {
    var w = sheet(type === 'projet' ? 'Neues Projekt' : 'Neue Immobilie', '<form class="kx-form">' +
      '<label>Titel<input name="t" required placeholder="' + (type === 'projet' ? 'z. B. Residence … – Ort' : 'z. B. Apartment 02 – Residence … – Ort') + '"></label>' +
      '<label>Ort <small>setzt die Position auf der Karte</small><input name="loc" list="kx-places" autocomplete="off" required></label><datalist id="kx-places"></datalist><p class="kx-err" hidden>Ort nicht gefunden – bitte Schreibweise prüfen.</p>' +
      '<p class="kx-hint">Die neue Seite übernimmt das Layout der bestehenden. Danach Bilder, Texte und Angaben direkt anpassen und speichern.</p>' +
      '<button class="kx-btn kx-primary kx-block" type="submit">Anlegen</button></form>');
    var places = [];
    loadPlaces().then(function (list) { places = list; $('#kx-places', w).innerHTML = list.filter(function (p) { return p[3] <= 4; }).map(function (p) { return '<option value="' + esc(p[0].split('|')[0]) + '">'; }).join(''); });
    $('form', w).onsubmit = function (e) {
      e.preventDefault();
      var title = e.target.t.value.trim(); if (!title) return;
      var pl = findPlace(places, e.target.loc.value);
      if (!pl) { $('.kx-err', w).hidden = false; e.target.loc.focus(); return; }
      closeSheet();
      var tpl = C.data.items.filter(function (x) { return x.type === type; })[0];
      var it = clone(tpl), base = slug(title), id = base, n = 2;
      while (C.data.items.some(function (x) { return x.id === id; })) id = base + '-' + n++;
      it.id = id; it.titre = title; it.images = []; it.a_laffiche = false; it.ancienne_url = null; it.video = null; it.video_poster = null;
      it.unites = []; it.projet = null; it.description = {}; it.brochure = null; it.avant = it.apres = null;
      it.localite = it.gemeinde = pl[0].split('|')[0]; it.lat = pl[1]; it.lng = pl[2]; it.adresse = null; it.adresse_exacte = false;
      change(function () { C.data.items.unshift(it); }, false);
      save().then(function () { location.href = A.url(it); });
    };
  }
  function newTeamSheet() {
    var w = sheet('Neue Person im Team', '<form class="kx-form"><label>Name<input name="n" required></label><label>Funktion<input name="r"></label>' +
      '<button class="kx-btn kx-primary kx-block" type="submit">Anlegen</button></form>');
    $('form', w).onsubmit = function (e) {
      e.preventDefault();
      var nom = e.target.n.value.trim(); if (!nom) return;
      var id = slug(nom), m = { id: id, nom: nom, role: e.target.r.value.trim(), photo: '', bereiche: [], url: '/team/' + id + '/', bio: {}, groupe: 'equipe' };
      closeSheet();
      change(function () { C.data.team.push(m); });
      toast('Person angelegt – Foto antippen, um ein Bild hinzuzufügen', 4500);
    };
  }
  function resetItem(id) {
    var o = ST.original.data.items.filter(function (x) { return x.id === id; })[0];
    if (!o) { toast('Dieses Objekt gibt es im Original nicht – es kann nur gelöscht werden.', 4000); return; }
    confirmBox('Objekt zurücksetzen', 'Alle Änderungen an diesem Objekt werden verworfen.', 'Zurücksetzen', true).then(function (ok) {
      if (!ok) return;
      change(function () { C.data.items = C.data.items.map(function (x) { return x.id === id ? clone(o) : x; }); });
      save();
    });
  }
  function resetAll() {
    confirmBox('Ganze Website zurücksetzen', 'Alle Änderungen, neuen Einträge und hochgeladenen Bilder werden gelöscht. Die Website sieht danach wieder genau aus wie das Original.', 'Alles zurücksetzen', true).then(function (ok) {
      if (!ok) return;
      S.resetContent().then(function () {
        window.DRP_SAVED = null; window.DRP_CONTENT = null;
        C = fresh(); undo = []; dirty = false; updateBar(); sel = null; showCtx();
        refresh();
        toast('Website auf Original zurückgesetzt');
      });
    });
  }

  /* ------------------------------------------------------------ angemeldet geblieben? (gilt bis der Browser-Tab geschlossen wird) */
  S.isLoggedIn().then(function (yes) { if (yes) (window.DRP_READY || Promise.resolve()).then(start); });
})();
