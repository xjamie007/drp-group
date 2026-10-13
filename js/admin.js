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
    return { version: 1, data: c.data || clone(ST.original.data), i18n: c.i18n || {}, seo: c.seo || {}, alts: c.alts || {} };
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
    C = fresh();
    document.documentElement.classList.add('kx-on');
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
      '<button class="kx-b" data-a="seo"><span class="kx-i">G</span><span>Google</span></button>' +
      '<button class="kx-b" data-a="more"><span class="kx-i">⋯</span><span>Mehr</span></button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      ({ save: save, undo: doUndo, pages: pagesSheet, seo: seoSheet, more: moreSheet })[b.getAttribute('data-a')]();
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
    if (e.target.closest('.kx-text')) { select(e.target); return; }
    var img = e.target.closest('img') || (e.target.closest('.hero__media') && $('.hero__media img')); // Startseite: Video liegt über dem Foto
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
      confirmBox(LABEL[sel.list] + ' löschen', 'Soll das wirklich gelöscht werden? (Mit „Rückgängig“ holen Sie es zurück.)', 'Löschen', true).then(function (ok) {
        if (ok) { sel = null; change(function () { list.splice(i, 1); }); showCtx(); }
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
          cv.toBlob(function (j) { j ? done(j, 'jpg') : rej(new Error('encode')); }, 'image/jpeg', 0.82);
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
    if ((A.page === 'bien' || A.page === 'projet') && id) {
      var i = itemIndexByHref('?id=' + encodeURIComponent(id));
      if (i > -1) {
        var g = $('.gallery__main') || $('#main section, #main .wrap');
        chip(g, '🖼 Bilder verwalten (' + C.data.items[i].images.length + ')', function () { galleryManager('items.' + i + '.images', C.data.items[i].titre); }, 'kx-chip-gal');
        chip($('#main h1') && $('#main h1').parentElement, '✎ Angaben zu diesem Objekt', function () { itemSheet(i); });
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
  function field(label, name, val, type, hint) {
    return '<label>' + label + (hint ? ' <small>' + hint + '</small>' : '') + (type === 'area'
      ? '<textarea name="' + name + '" rows="6">' + esc(val == null ? '' : val) + '</textarea>'
      : '<input name="' + name + '" value="' + esc(val == null ? '' : val) + '"' + (type === 'num' ? ' inputmode="decimal"' : '') + '>') + '</label>';
  }
  function itemSheet(i) {
    var it = C.data.items[i], l = lang(), desc = it.description || {};
    var w = sheet(it.type === 'projet' ? 'Projekt – Angaben' : 'Immobilie – Angaben', '<form class="kx-form">' +
      field('Titel', 'titre', it.titre) +
      field('Ort', 'localite', it.localite) + field('Gemeinde', 'gemeinde', it.gemeinde) +
      '<label>Stand<select name="statut">' + STATUS.map(function (s) { return '<option value="' + s + '"' + (s === it.statut ? ' selected' : '') + '>' + esc(strip(A.t('status.' + s))) + '</option>'; }).join('') + '</select></label>' +
      (it.type === 'bien' ? field('Preis in €', 'prix', it.prix, 'num', 'leer = „Preis auf Anfrage“') + field('Wohnfläche in m²', 'surface', it.surface, 'num') : field('Anzahl Einheiten', 'unites_total', it.unites_total, 'num')) +
      field('Schlafzimmer', 'chambres', it.chambres, '', 'z. B. 3 oder 2–3') +
      field('Beschreibung (' + l.toUpperCase() + ')', 'desc', (desc[l] || desc.en || []).join ? (desc[l] || desc.en || []).join('\n\n') : (desc[l] || ''), 'area', 'Leerzeile = neuer Absatz') +
      '<label class="kx-check"><input type="checkbox" name="aff"' + (it.a_laffiche ? ' checked' : '') + '> Auf der Startseite unter „Im Fokus“ zeigen (höchstens 3)</label>' +
      field('Kartenposition – Breite', 'lat', it.lat, 'num', 'Ortsmitte, z. B. aus Google Maps') + field('Kartenposition – Länge', 'lng', it.lng, 'num') +
      '<button class="kx-btn kx-primary kx-block" type="submit">Übernehmen</button></form>');
    $('form', w).onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, n = function (v) { v = String(v).replace(',', '.').trim(); return v === '' ? null : +v; };
      if (f.aff.checked && !it.a_laffiche && C.data.items.filter(function (x) { return x.a_laffiche; }).length >= 3) { toast('„Im Fokus“ zeigt höchstens 3 Objekte. Bitte zuerst bei einem anderen das Häkchen entfernen.', 5000); return; }
      change(function () {
        it.titre = f.titre.value.trim(); it.localite = f.localite.value.trim(); it.gemeinde = f.gemeinde.value.trim(); it.statut = f.statut.value;
        if (f.prix) { it.prix = n(f.prix.value); it.surface = n(f.surface.value); }
        if (f.unites_total) it.unites_total = n(f.unites_total.value);
        it.chambres = f.chambres.value.trim() || null;
        it.description = it.description || {};
        it.description[l] = f.desc.value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        it.a_laffiche = f.aff.checked;
        if (n(f.lat.value) != null) it.lat = n(f.lat.value);
        if (n(f.lng.value) != null) it.lng = n(f.lng.value);
      });
      closeSheet(); toast('Angaben übernommen – bitte Speichern nicht vergessen');
    };
  }
  function teamSheet(i) {
    var m = C.data.team[i], l = lang(), bio = m.bio || {};
    var w = sheet('Person – Angaben', '<form class="kx-form">' + field('Name', 'nom', m.nom) + field('Funktion', 'role', m.role) +
      '<label>Gruppe<select name="groupe"><option value="associes"' + (m.groupe === 'associes' ? ' selected' : '') + '>Partner (oben)</option><option value="equipe"' + (m.groupe !== 'associes' ? ' selected' : '') + '>Team</option></select></label>' +
      field('E-Mail', 'email', m.email) + field('Telefon', 'tel', m.tel) +
      field('Text auf der Profilseite (' + l.toUpperCase() + ')', 'bio', (bio[l] || bio.en || []).join ? (bio[l] || bio.en || []).join('\n\n') : '', 'area', 'Leerzeile = neuer Absatz') +
      '<button class="kx-btn kx-primary kx-block" type="submit">Übernehmen</button></form>');
    $('form', w).onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      change(function () {
        m.nom = f.nom.value.trim(); m.role = f.role.value.trim(); m.groupe = f.groupe.value;
        m.email = f.email.value.trim() || undefined; m.tel = f.tel.value.trim() || undefined;
        m.bio = m.bio || {}; m.bio[l] = f.bio.value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      });
      closeSheet(); toast('Angaben übernommen – bitte Speichern nicht vergessen');
    };
  }

  /* ------------------------------------------------------------ Seiten, Google, Mehr */
  var PAGES = [['index.html', 'Startseite'], ['biens.html', 'Immobilien'], ['projets.html', 'Projekte'], ['carte.html', 'Karte'], ['durabilite.html', 'Nachhaltigkeit'],
    ['about.html', 'Über uns'], ['team.html', 'Team'], ['services.html', 'Leistungen'], ['contact.html', 'Kontakt'], ['estimation.html', 'Kostenlose Bewertung'],
    ['drp-luxembourg.html', 'DRP Luxembourg'], ['drp-real-estate.html', 'DRP Real Estate'], ['drp-senses.html', 'DRP Senses'], ['drp-architecture.html', 'DRP Architecture']];
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
    var li = function (href, label) { return '<button class="kx-li' + (here === href || (here === '' && href === 'index.html') ? ' kx-cur' : '') + '" data-p="' + esc(href) + '">' + esc(strip(label)) + '</button>'; };
    var items = function (type) { return C.data.items.filter(function (x) { return x.type === type; }).map(function (x) { return li(A.url(x), x.titre); }).join(''); };
    var html = '<h3 class="kx-h3">Seiten</h3><div class="kx-list">' + PAGES.map(function (p) { return li(p[0], p[1]); }).join('') + '</div>' +
      '<h3 class="kx-h3">Projekte</h3><div class="kx-list">' + items('projet') + '</div>' +
      '<h3 class="kx-h3">Immobilien</h3><div class="kx-list">' + items('bien') + '</div>' +
      '<div class="kx-row" style="margin-top:12px"><button class="kx-btn kx-ghost" data-n="bien">+ Neue Immobilie</button><button class="kx-btn kx-ghost" data-n="projet">+ Neues Projekt</button></div>';
    var w = sheet('Seite öffnen', html, { noFocus: true });
    $$('[data-p]', w).forEach(function (b) { b.onclick = function () { closeSheet(); go(b.getAttribute('data-p')); }; });
    $$('[data-n]', w).forEach(function (b) { b.onclick = function () { newItemSheet(b.getAttribute('data-n')); }; });
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
  function moreSheet() {
    commitEditing();
    var id = A.param('id'), isItem = (A.page === 'bien' || A.page === 'projet') && id;
    var html = '<div class="kx-list">' +
      '<button class="kx-li" data-m="newb">➕ Neue Immobilie</button>' +
      '<button class="kx-li" data-m="newp">➕ Neues Projekt</button>' +
      '<button class="kx-li" data-m="newt">➕ Neue Person im Team</button>' +
      '<button class="kx-li" data-m="help">❓ Kurzanleitung</button>' +
      (isItem ? '<button class="kx-li" data-m="resetp">↺ Dieses Objekt auf Original zurücksetzen</button>' : '') +
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
        if (a === 'resetp') resetItem(id);
        if (a === 'reset') resetAll();
        if (a === 'logout') logout();
      };
    });
  }
  function helpSheet() {
    sheet('Kurzanleitung', '<ol class="kx-help">' +
      '<li><b>Text ändern:</b> Text antippen und lostippen. Gilt für die oben gewählte Sprache – für eine andere Sprache einfach die Sprache wechseln.</li>' +
      '<li><b>Bild ändern:</b> Bild antippen → „Foto aus Galerie“ oder „Foto aufnehmen“.</li>' +
      '<li><b>Bilder eines Objekts oder der Fotowand:</b> Knopf „Bilder verwalten“ – hinzufügen, löschen, Reihenfolge.</li>' +
      '<li><b>Objekte und Personen:</b> Karte antippen – unten erscheinen ↑ ↓, Angaben, Kopieren, Löschen.</li>' +
      '<li><b>Neues Objekt / neue Person:</b> unter „Mehr“ oder „Seiten“.</li>' +
      '<li><b>Google:</b> Titel, Beschreibung und Bildbeschreibungen pro Seite und Sprache.</li>' +
      '<li><b>Andere Seite bearbeiten:</b> „Seiten“.</li>' +
      '<li><b>Fertig?</b> Auf <b>Speichern</b> tippen. Vertippt? <b>Rückgängig</b>.</li></ol>', { noFocus: true });
  }
  function newItemSheet(type) {
    var w = sheet(type === 'projet' ? 'Neues Projekt' : 'Neue Immobilie', '<form class="kx-form">' +
      '<label>Titel<input name="t" required placeholder="' + (type === 'projet' ? 'z. B. Residence … – Ort' : 'z. B. Apartment 02 – Residence … – Ort') + '"></label>' +
      '<p class="kx-hint">Die neue Seite übernimmt das Layout der bestehenden. Danach Bilder, Texte und Angaben direkt anpassen und speichern.</p>' +
      '<button class="kx-btn kx-primary kx-block" type="submit">Anlegen</button></form>');
    $('form', w).onsubmit = function (e) {
      e.preventDefault();
      var title = e.target.t.value.trim(); if (!title) return;
      closeSheet();
      var tpl = C.data.items.filter(function (x) { return x.type === type; })[0];
      var it = clone(tpl), base = slug(title), id = base, n = 2;
      while (C.data.items.some(function (x) { return x.id === id; })) id = base + '-' + n++;
      it.id = id; it.titre = title; it.images = []; it.a_laffiche = false; it.ancienne_url = null; it.video = null; it.video_poster = null;
      it.unites = []; it.projet = null; it.description = {}; it.brochure = null; it.avant = it.apres = null;
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
