/* DRP Group – Prototyp. Vanilla JS, kein Build. Liest DRP_DATA (data.js) und DRP_I18N (i18n/*.js). */
(function () {
  "use strict";

  var D = window.DRP_DATA;
  var I = window.DRP_I18N;
  var LANGS = ["en", "fr", "de", "lb"];
  var LOCALES = { en: "en-GB", fr: "fr-LU", de: "de-LU", lb: "lb-LU" };
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;
  var PAGE = body.dataset.page;
  var IS_OBJ = PAGE === "bien" || PAGE === "projet"; // auf Objektseiten keine „Kostenlose Bewertung“
  var lang = pickLang();
  var cleanups = [];

  /* ------------------------------------------------------------ i18n */
  function pickLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (LANGS.indexOf(q) > -1) return q;
    try { var s = localStorage.getItem("drp-lang"); if (LANGS.indexOf(s) > -1) return s; } catch (e) { /* file:// ohne Storage */ }
    return "en";
  }
  function lookup(dict, key) {
    return key.split(".").reduce(function (o, k) { return o && o[k] !== undefined ? o[k] : undefined; }, dict);
  }
  function t(key, vars) {
    if (window.DRP_EDIT) (window.DRP_USED = window.DRP_USED || {})[key] = 1; // Admin: „Alle Texte dieser Seite“
    var s = lookup(I[lang], key);
    if (s === undefined) s = lookup(I.en, key);
    if (s === undefined) return key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    else if (window.DRP_EDIT) s = "\uE000" + key + "\uE001" + s + "\uE002";
    return s;
  }
  var keepY = null; // Scrollposition über einen Sprachwechsel retten
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-lang]");
    if (b) { e.preventDefault(); setLang(b.getAttribute("data-lang")); }
  });
  function setLang(l) {
    keepY = window.scrollY;
    var m = $("#main"); if (m) m.style.minHeight = m.offsetHeight + "px"; // Seite nicht zusammenfallen lassen
    lang = l;
    try { localStorage.setItem("drp-lang", l); } catch (e) { /* ignore */ }
    var u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.set("lang", l); history.replaceState(null, "", u); }
    render();
  }
  function txt(obj) { return obj ? (obj[lang] || obj.en || []) : []; }

  /* ------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function nf(opts) {
    try { return new Intl.NumberFormat(LOCALES[lang], opts); } catch (e) { return new Intl.NumberFormat("de-LU", opts); }
  }
  function money(n) { return nf({ style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
  function num(n) { return nf({ maximumFractionDigits: 2 }).format(n); }
  function byId(id) { return D.items.filter(function (i) { return i.id === id; })[0]; }
  function member(id) { return D.team.filter(function (m) { return m.id === id; })[0]; }
  function bereich(id) { return D.bereiche.filter(function (b) { return b.id === id; })[0]; }
  function param(k) { return new URLSearchParams(location.search).get(k); }
  function isClosed(it) { return it.statut === "vendu" || it.statut === "loue"; }
  function url(it) { return (it.type === "projet" ? "projet.html" : "bien.html") + "?id=" + encodeURIComponent(it.id); }
  function place(it) { return it.localite === it.gemeinde ? it.localite : it.localite + ", " + it.gemeinde; }
  function todo() { return '<span class="todo">' + esc(t("common.todo")) + "</span>"; }

  function children(p) { return D.items.filter(function (b) { return b.projet === p.id; }); }
  function availableFrom(p) {
    var prices = children(p).filter(function (b) { return b.statut === "a-vendre" && b.prix; });
    if (!prices.length) return null;
    var min = prices.reduce(function (a, b) { return b.prix < a.prix ? b : a; });
    return { prix: min.prix, tva3: min.prix_tva3 };
  }
  function surfaceText(it) {
    if (it.surface) return num(it.surface) + " m²";
    if (it.surface_texte) return it.surface_texte + " m²";
    var s = children(it).map(function (b) { return b.surface; }).filter(Boolean);
    if (s.length > 1) return num(Math.min.apply(null, s)) + "–" + num(Math.max.apply(null, s)) + " m²";
    return "";
  }
  function bedroomsText(it) {
    if (!it.chambres) return "";
    return it.chambres === "1" ? t("fmt.bedroom") : t("fmt.bedrooms", { n: it.chambres });
  }
  function priceText(it) {
    if (it.type === "projet") {
      var f = availableFrom(it);
      if (f) return t("fmt.from", { p: money(f.prix) }) + (f.tva3 ? " · " + t("fmt.vat3") : "");
      if (it.vente) return t("fmt.sold_of", { v: it.vente });
      return t("status." + it.statut);
    }
    if (isClosed(it)) return t("status." + it.statut);
    if (!it.prix) return t("fmt.on_request");
    return money(it.prix) + (it.statut === "a-louer" ? " " + t("fmt.per_month") : "") + (it.prix_tva3 ? " · " + t("fmt.vat3") : "");
  }
  function metaLine(it) {
    var parts = it.type === "projet"
      ? [it.unites_total ? t("fmt.units", { n: it.unites_total }) : "", bedroomsText(it)]
      : [surfaceText(it), bedroomsText(it)];
    return parts.filter(Boolean).join(" · ");
  }
  function availabilityText(v) {
    if (!v) return "";
    if (v === "now") return t("fmt.now");
    if (v === "tbd") return t("fmt.tbd");
    return v;
  }

  /* Bild in festem Rahmen; fehlt das Bild → Platzhalter „Photo à venir“ */
  function ph(alt) { return '<div class="ph' + (alt ? " ph--alt" : "") + '"><span>' + esc(t("common.photo_soon")) + "</span></div>"; }
  function img(src, alt, ratio, eager) {
    return '<div class="ratio ' + ratio + '">' + (src
      ? '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">'
      : ph()) + "</div>";
  }
  /* Übersichten: kleine Fassung (…-card.jpg, 800 px) der Original-Objektfotos; hochgeladene Bilder ohne */
  var CARD_IMG = {};
  ((window.DRP_STORE ? window.DRP_STORE.original.data : D).items || []).forEach(function (it) { it.images.forEach(function (x) { if (/\.jpg$/.test(x)) CARD_IMG[x] = 1; }); });
  function cardImg(src, alt, ratio, eager) {
    var html = img(src, alt, ratio, eager);
    if (!CARD_IMG[src]) return html;
    return html.replace('<img src="' + esc(src) + '"', '<img src="' + esc(src) + '" srcset="' + esc(src.replace(/\.jpg$/, "-card.jpg")) + ' 800w, ' + esc(src) + ' 1400w"' +
      ' sizes="(min-width: 1100px) 380px, (min-width: 700px) 50vw, 100vw"');
  }
  function badge(it) {
    if (!isClosed(it)) return "";
    return '<span class="badge' + (it.statut === "loue" ? " badge--dark" : "") + '">' + esc(t("status." + it.statut)) + "</span>";
  }
  function media(it, ratio, eager) {
    return '<div class="card__media" style="position:relative">' + badge(it) + cardImg(it.images[0], it.titre, ratio, eager) + "</div>";
  }
  function card(it) {
    return '<div class="card-wrap">' + cardLink(it) + favBtn(it) + "</div>";
  }
  function cardLink(it) {
    return '<a class="card' + (isClosed(it) ? " is-closed" : "") + '" href="' + url(it) + '">' + media(it, "r-4x5") +
      '<div class="card__place">' + esc(place(it)) + "</div>" +
      '<h3 class="card__title">' + esc(it.titre) + "</h3>" +
      '<div class="card__meta">' + esc(metaLine(it)) + "</div>" +
      '<div class="card__price">' + esc(priceText(it)) + "</div></a>";
  }

  /* Scroll-Animation: Blöcke unterhalb des sichtbaren Bereichs gleiten beim Runterscrollen sanft herein.
     Was beim Laden schon zu sehen ist, bleibt unberührt (kein Aufblitzen); ohne IntersectionObserver,
     bei „Bewegung reduzieren“ und im Bearbeiten-Modus passiert nichts. */
  var RV_SEL = [".page-intro", ".section-head", ".section .wrap > .lead", ".wrap--narrow > *", ".split > *", ".grid > *", ".ventures > *",
    ".team-grid > *", ".services > *", ".principles > li", ".fpc-section", ".map-preview", ".quote .wrap", ".cta-band .wrap > *",
    ".arch-film-v", ".arch-wall > li", ".senses-words", ".contact-card", ".detail-grid > *", ".footer-grid > div"].join(",");
  function reveal(root) {
    if (REDUCED || window.DRP_EDIT || !("IntersectionObserver" in window)) return;
    // Fotos im Block erst laden lassen, sonst tauchen sie in Ladereihenfolge statt von links nach rechts auf (max. 6 s warten)
    function loaded(el) {
      var ims = $$("img", el).filter(function (im) { return !im.complete; });
      if (!ims.length) return Promise.resolve();
      ims.forEach(function (im) { im.loading = "eager"; });
      return Promise.race([
        Promise.all(ims.map(function (im) { return new Promise(function (r) { im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); }); })),
        new Promise(function (r) { setTimeout(r, 6000); })
      ]);
    }
    var io = new IntersectionObserver(function (es) {
      // was gleichzeitig ins Bild kommt, erscheint der Reihe nach: oben vor unten, links vor rechts (auch bei mehrspaltigen Rastern)
      var chain = Promise.resolve();
      es.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left); })
        .forEach(function (e) {
          var el = e.target, ready = loaded(el);
          io.unobserve(el);
          chain = chain.then(function () { return ready; }).then(function () {
            el.classList.add("rv-in");
            return new Promise(function (r) { setTimeout(r, 90); }); // nächster Block kurz danach
          });
        });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    var fold = innerHeight;
    $$(RV_SEL, root.parentNode || document).forEach(function (el) {
      if (el.closest(".rv") || el.getBoundingClientRect().top < fold) return;
      el.classList.add("rv");
      io.observe(el);
    });
    document.documentElement.classList.add("rv-on");
    cleanups.push(function () { io.disconnect(); });
  }

  /* ------------------------------------------------------------ Merkliste (nur auf diesem Gerät) und Teilen */
  function favGet() { try { var v = JSON.parse(localStorage.getItem("drp-fav") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return favGet.mem || []; } }
  function favSet(a) { favGet.mem = a; try { localStorage.setItem("drp-fav", JSON.stringify(a)); } catch (e) { /* privates Fenster: nur bis zum Neuladen */ } }
  function favHas(id) { return favGet().indexOf(id) > -1; }
  function favBtn(it) {
    var on = favHas(it.id);
    return '<button type="button" class="fav-btn" data-fav="' + esc(it.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t(on ? "fav.remove_aria" : "fav.add_aria", { t: it.titre })) + '">' + ICON.heart + "</button>";
  }
  function favSync() { // alle Herzen, Zähler und Merk-Knöpfe auf den aktuellen Stand bringen
    var list = favGet();
    $$("[data-fav]").forEach(function (b) {
      var id = b.getAttribute("data-fav"), on = list.indexOf(id) > -1, it = byId(id);
      b.setAttribute("aria-pressed", String(on));
      if (b.classList.contains("fav-btn") && it) b.setAttribute("aria-label", t(on ? "fav.remove_aria" : "fav.add_aria", { t: it.titre }));
      var lbl = $("span", b); if (lbl && b.classList.contains("fav-toggle")) lbl.textContent = t(on ? "fav.saved" : "fav.save");
    });
    $$("[data-fav-count]").forEach(function (c) { c.textContent = list.length || ""; });
    $$(".fav-link").forEach(function (a) { a.setAttribute("aria-label", t("fav.nav") + (list.length ? " – " + t("fav.count", { n: list.length }) : "")); });
  }
  function plain(x) { return String(x).replace(/\uE000[^\uE001]*\uE001|\uE002/g, ""); } // ohne Admin-Markierungen
  function shareUrl(path) {
    var u = new URL(path || location.href, location.href); u.searchParams.delete("lang"); u.hash = ""; return u.href;
  }
  function shareBox(url, text, subject) {
    var enc = encodeURIComponent;
    return '<div class="share"><span class="eyebrow">' + esc(t("share.title")) + '</span><div class="share__btns">' +
      (navigator.share ? '<button type="button" class="share__btn" data-share-native data-url="' + esc(url) + '" data-text="' + esc(text) + '">' + ICON.share + "<span>" + esc(t("share.native")) + "</span></button>" : "") +
      '<a class="share__btn" href="https://wa.me/?text=' + enc(text + " " + url) + '" target="_blank" rel="noopener">' + ICON.wa + "<span>" + esc(t("share.whatsapp")) + '</span><span class="visually-hidden"> (' + esc(t("common.opens_new")) + ")</span></a>" +
      '<a class="share__btn" href="mailto:?subject=' + enc(subject) + "&body=" + enc(text + "\n\n" + url) + '">' + ICON.mail + "<span>" + esc(t("share.email")) + "</span></a>" +
      '<button type="button" class="share__btn" data-copy="' + esc(url) + '">' + ICON.link + "<span>" + esc(t("share.copy")) + "</span></button>" +
      '</div><span class="visually-hidden" role="status" data-share-status></span></div>';
  }
  function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    return new Promise(function (res, rej) { // Ersatz für file:// und ältere Browser
      var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) { /* ignore */ }
      ta.remove(); ok ? res() : rej();
    });
  }
  document.addEventListener("click", function (e) {
    var f = e.target.closest("[data-fav]");
    if (f) {
      e.preventDefault(); e.stopPropagation();
      var id = f.getAttribute("data-fav"), list = favGet(), i = list.indexOf(id);
      if (i > -1) list.splice(i, 1); else list.push(id);
      favSet(list); favSync();
      if (PAGE === "merkliste" && !param("ids")) render();
      return;
    }
    var c = e.target.closest("[data-copy]");
    if (c) {
      var lbl = $("span", c), old = lbl.textContent;
      copyText(c.getAttribute("data-copy")).then(function () {
        lbl.textContent = t("share.copied"); var st = $("[data-share-status]", c.closest(".share")); if (st) st.textContent = t("share.copied");
        setTimeout(function () { lbl.textContent = old; }, 2000);
      }, function () { window.prompt(t("share.copy"), c.getAttribute("data-copy")); });
      return;
    }
    var n = e.target.closest("[data-share-native]");
    if (n) navigator.share({ title: document.title, text: n.getAttribute("data-text"), url: n.getAttribute("data-url") }).catch(function () { /* abgebrochen */ });
  });

  /* Fehlende Bilddatei → Platzhalter, damit das Layout steht */
  document.addEventListener("error", function (e) {
    var el = e.target;
    // kurzer Netzaussetzer: einmal neu laden, erst dann Platzhalter
    if (el.tagName === "IMG" && !el.dataset.retry && el.getAttribute("src")) {
      el.dataset.retry = "1";
      var src = el.getAttribute("src");
      setTimeout(function () { el.removeAttribute("srcset"); el.src = src + (src.indexOf("?") < 0 && !/^(blob|data):/.test(src) ? "?r=1" : ""); }, 800);
      return;
    }
    if (el.tagName === "IMG" && el.parentNode && el.parentNode.classList.contains("ratio")) el.outerHTML = ph();
    if (el.tagName === "IMG" && el.closest(".hero__media")) el.style.visibility = "hidden";
  }, true);

  /* ------------------------------------------------------------ icons */
  var ICON = {
    heart: '<svg class="i-heart" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.6a4.3 4.3 0 017.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    wa: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 00-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1012 3.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.2 8.6c.3-.6.6-.6.9-.6h.4c.2 0 .4 0 .5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.2.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.4c0 .3 0 .6-.6.9-.5.3-1.7.5-3.6-.6a8 8 0 01-3-3c-1.1-1.9-.9-3.1-.6-3.6z" fill="currentColor"/></svg>',
    mail: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 6.5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    link: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.5-6-11a6 6 0 1112 0c0 5.5-6 11-6 11z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="10" r="2" fill="currentColor"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3h3l1.5 4.2-2 1.3a12 12 0 006.4 6.4l1.3-2L21 14.4v3A2.6 2.6 0 0118.4 20 15.4 15.4 0 014 5.6 2.6 2.6 0 016.6 3z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 11-.01 5 2.5 2.5 0 01.01-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.2 21 14.5V21h-4v-5.8c0-1.4 0-3.2-1.95-3.2S13 13.5 13 15.1V21H9z"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></svg>'
  };

  /* ------------------------------------------------------------ header / footer */
  function langSwitch() {
    return '<div class="lang" role="group" aria-label="' + esc(t("common.language")) + '">' + LANGS.map(function (l, i) {
      return (i ? '<span class="sep" aria-hidden="true">·</span>' : "") +
        '<button type="button" data-lang="' + l + '" lang="' + l + '" aria-pressed="' + (l === lang) + '">' + l.toUpperCase() + "</button>";
    }).join("") + "</div>";
  }
  /* Kopfleiste: nur die aktive Sprache + Pfeil; Klick öffnet die Liste aller Sprachen */
  var LANG_NAMES = { en: "English", fr: "Français", de: "Deutsch", lb: "Lëtzebuergesch" };
  function langMenu() {
    return '<div class="lang-menu"><button type="button" class="lang-menu__btn" aria-expanded="false" aria-controls="lang-list" aria-haspopup="true"' +
      ' aria-label="' + esc(t("common.language") + ": " + LANG_NAMES[lang]) + '">' + lang.toUpperCase() +
      '<svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
      '<ul class="lang-menu__list" id="lang-list">' + LANGS.map(function (l) {
        return '<li><button type="button" data-lang="' + l + '" lang="' + l + '" aria-pressed="' + (l === lang) + '"><span>' + l.toUpperCase() + "</span>" + LANG_NAMES[l] + "</button></li>";
      }).join("") + "</ul></div>";
  }
  var NAV = [
    ["biens", "biens.html", "nav.properties"],
    ["projets", "projets.html", "nav.projects"],
    ["carte", "carte.html", "nav.map"],
    ["durabilite", "durabilite.html", "nav.sustainability"],
    ["about", "about.html", "nav.about"],
    ["contact", "contact.html", "nav.contact"]
  ];
  function current(p) { return PAGE === p || (p === "biens" && PAGE === "bien") || (p === "projets" && PAGE === "projet") || (p === "team" && PAGE === "membre") ? ' aria-current="page"' : ""; }
  function header() {
    var subs = D.bereiche.map(function (b) { return '<li><a href="' + b.page + '">' + esc(b.nom) + "</a></li>"; }).join("");
    $("#header").innerHTML =
      '<header class="site-header"><div class="wrap">' +
      '<a class="logo" href="index.html"><img src="' + esc(D.site.logo || "assets/logo-drp-group.png") + '" width="77" height="46" alt="' + esc(t("common.logo_alt")) + '"></a>' +
      '<nav class="nav" aria-label="Main"><ul>' +
      '<li class="has-sub"><button type="button" class="nav-toggle" aria-expanded="false" aria-controls="sub-activities">' + esc(t("nav.activities")) + ' ▾</button>' +
      '<ul class="sub" id="sub-activities">' + subs + "</ul></li>" +
      NAV.map(function (n) { return '<li><a href="' + n[1] + '"' + current(n[0]) + ">" + esc(t(n[2])) + "</a></li>"; }).join("") +
      "</ul></nav>" +
      '<div class="header-actions">' + '<a class="fav-link" href="merkliste.html"' + current("merkliste") + ">" + ICON.heart + '<span class="fav-count" data-fav-count>' + (favGet().length || "") + "</span></a>" + langMenu() +
      (IS_OBJ ? "" : '<a class="btn" href="estimation.html">' + esc(t("nav.cta")) + "</a>") +
      '<button type="button" class="menu-btn" aria-expanded="false" aria-controls="mobile-menu">' + esc(t("common.menu")) + '<span class="bars" aria-hidden="true"></span></button>' +
      "</div></div></header>" +
      '<div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="' + esc(t("common.menu")) + '">' +
      '<div class="mobile-menu__top"><a class="logo" href="index.html"><img src="' + esc(D.site.logo || "assets/logo-drp-group.png") + '" width="77" height="46" alt="' + esc(t("common.logo_alt")) + '"></a>' +
      '<button type="button" class="menu-btn" data-close>' + esc(t("common.close")) + "</button></div>" +
      '<nav aria-label="Mobile"><ul>' +
      NAV.map(function (n) { return '<li><a href="' + n[1] + '"' + current(n[0]) + ">" + esc(t(n[2])) + "</a></li>"; }).join("") +
      '<li><a href="team.html"' + current("team") + ">" + esc(t("nav.team")) + '</a></li><li><a href="merkliste.html"' + current("merkliste") + ">" + esc(t("fav.nav")) + "</a></li></ul>" +
      '<span class="eyebrow group-label">' + esc(t("nav.activities")) + "</span><ul>" + subs + "</ul></nav>" +
      langSwitch() + '<a class="btn" href="estimation.html">' + esc(t("nav.cta")) + "</a>" + ctaNote() + "</div>";

    var hdr = $(".site-header");
    var toggle = $(".nav-toggle");
    var sub = $("#sub-activities");
    function closeSub() { sub.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
    toggle.addEventListener("click", function () {
      var open = !sub.classList.contains("is-open");
      sub.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".has-sub")) closeSub(); });
    $(".has-sub").addEventListener("keydown", function (e) { if (e.key === "Escape") { closeSub(); toggle.focus(); } });

    var lm = $(".lang-menu"), lmBtn = $(".lang-menu__btn");
    function setLangMenu(open) { lm.classList.toggle("is-open", open); lmBtn.setAttribute("aria-expanded", String(open)); }
    lmBtn.addEventListener("click", function () {
      var open = !lm.classList.contains("is-open");
      setLangMenu(open);
      if (open) $('.lang-menu__list [aria-pressed="true"]').focus();
    });
    lm.addEventListener("keydown", function (e) {
      var items = $$(".lang-menu__list button"), i = items.indexOf(document.activeElement);
      if (e.key === "Escape") { setLangMenu(false); lmBtn.focus(); }
      if (e.key === "ArrowDown" && i > -1) { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === "ArrowUp" && i > -1) { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".lang-menu")) setLangMenu(false); });

    var menu = $("#mobile-menu");
    var opener = $(".site-header .menu-btn");
    function setMenu(open) {
      menu.classList.toggle("is-open", open);
      opener.setAttribute("aria-expanded", String(open));
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) $("[data-close]", menu).focus(); else opener.focus();
    }
    opener.addEventListener("click", function () { setMenu(true); });
    $("[data-close]", menu).addEventListener("click", function () { setMenu(false); });
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
      if (e.key === "Tab") { /* Fokus im Menü halten */
        var f = $$("a, button", menu), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    if (body.classList.contains("is-home")) {
      var onScroll = function () { hdr.classList.toggle("is-solid", window.scrollY > 40); };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(function () { window.removeEventListener("scroll", onScroll); });
      onScroll();
    }
  }

  function footer() {
    var s = D.site;
    var year = new Date().getFullYear();
    $("#footer").innerHTML =
      '<footer class="site-footer"><div class="wrap"><div class="footer-grid">' +
      '<div><h2>' + esc(t("footer.contact")) + '</h2><address>' + esc(s.societe) + "<br>" + s.adresse.map(esc).join("<br>") + "</address>" +
      "<ul style=\"margin-top:12px\">" + s.telephones.map(function (p) { return '<li><a href="' + p.href + '">' + esc(p.label) + "</a></li>"; }).join("") +
      '<li><a href="mailto:' + s.email + '">' + esc(s.email) + "</a></li></ul></div>" +
      "<div><h2>" + esc(t("footer.companies")) + "</h2><ul>" + D.bereiche.map(function (b) { return '<li><a href="' + b.page + '">' + esc(b.nom) + "</a></li>"; }).join("") + "</ul></div>" +
      "<div><h2>" + esc(t("footer.group")) + "</h2><ul>" +
      NAV.map(function (n) { return '<li><a href="' + n[1] + '">' + esc(t(n[2])) + "</a></li>"; }).join("") +
      '<li><a href="team.html">' + esc(t("nav.team")) + '</a></li><li><a href="estimation.html">' + esc(t("nav.cta")) + "</a></li></ul></div>" +
      "<div><h2>" + esc(t("footer.follow")) + '</h2><div class="social">' +
      '<a href="' + s.linkedin + '" target="_blank" rel="noopener" aria-label="LinkedIn (' + esc(t("common.opens_new")) + ')">' + ICON.linkedin + "</a>" +
      '<a href="' + s.instagram + '" target="_blank" rel="noopener" aria-label="Instagram (' + esc(t("common.opens_new")) + ')">' + ICON.instagram + "</a></div>" +
      '<h2 style="margin-top:32px">' + esc(t("common.language")) + "</h2>" + langSwitch() + "</div>" +
      "</div>" +
      '<div class="footer-bottom"><span>© ' + year + " " + esc(s.societe) + ". " + esc(t("footer.rights")) + "</span>" +
      '<a href="datenschutz.html"' + current("datenschutz") + ">" + esc(t("footer.privacy")) + "</a>" +
      '<a class="footer-credit" href="https://nave.lu" target="_blank" rel="noopener">Created by Nave</a></div>' +
      "</div></footer>" +
      '<div class="mobile-bar"><a href="' + s.telephones[0].href + '">' + ICON.phone + esc(t("common.call")) + '</a>' + (IS_OBJ ? '<a href="contact.html">' + esc(t("nav.contact")) + "</a>" : '<a href="estimation.html">' + esc(t("nav.cta")) + "</a>") + "</div>";
  }

  /* ------------------------------------------------------------ shared sections */
  // Bedingung zur kostenlosen Bewertung – steht überall, wo sie angeboten wird
  function ctaNote() { return '<p class="cta-note">' + esc(t("cta.condition")) + "</p>"; }
  function ctaBand() {
    return '<section class="cta-band on-dark"><div class="wrap"><div><h2>' + esc(t("cta.title")) + "</h2><p>" + esc(t("cta.text")) + "</p></div>" +
      '<div class="btn-row"><a class="btn btn--light" href="estimation.html">' + esc(t("cta.button")) + '</a>' +
      '<a class="btn btn--light" style="background:transparent;color:var(--white)" href="contact.html">' + esc(t("cta.secondary")) + "</a></div></div></section>";
  }
  /* Seitenkopf wie auf der alten Website: Foto, darüber weißer Kasten mit Logo | Linie | Überschrift */
  function pageHead(src, heading, sub) {
    // src als Liste: Fotos überblenden nacheinander (initHeadSlides); nur das erste lädt sofort
    var media = Array.isArray(src) && src.length > 1
      ? src.map(function (x, i) { return '<img class="ph-slide' + (i ? "" : " is-on") + '" ' + (i ? 'data-src="' : 'fetchpriority="high" src="') + esc(x) + '" alt="">'; }).join("")
      : (Array.isArray(src) ? src[0] : src) ? '<img src="' + esc(Array.isArray(src) ? src[0] : src) + '" alt="" fetchpriority="high">' : ph();
    return '<section class="page-head"><div class="page-head__img"' + (Array.isArray(src) && src.length > 1 ? " data-slides" : "") + ">" + media + "</div>" +
      '<div class="page-head__box"><img class="page-head__logo" src="' + esc(D.site.logo || "assets/logo-drp-group.png") + '" width="120" height="72" alt="">' +
      '<span class="page-head__rule" aria-hidden="true"></span><div class="page-head__text">' +
      (sub ? '<span class="eyebrow">' + esc(sub) + "</span>" : "") + "<h1>" + esc(heading) + "</h1></div></div></section>";
  }

  function contactCard(id) {
    var m = member(id);
    if (!m) return "";
    return '<section class="section section--tight"><div class="wrap"><span class="eyebrow">' + esc(t("page.your_contact")) + "</span>" +
      '<div class="contact-card">' + img(m.photo, m.nom, "r-2x3") +
      "<div><h3>" + esc(m.nom) + "</h3><p>" + esc(m.role) + "</p>" +
      "<p>" + (m.tel ? '<a href="tel:' + m.tel.replace(/\s/g, "") + '">' + esc(m.tel) + "</a><br>" : "") +
      '<a href="mailto:' + esc(m.email || D.site.email) + '">' + esc(m.email || D.site.email) + "</a></p></div></div></div></section>";
  }
  function services(prefix, n, emptyText) {
    var out = "";
    for (var i = 1; i <= n; i++) {
      var p = lookup(I.en, prefix + ".s" + i + "_p") ? esc(t(prefix + ".s" + i + "_p")) : emptyText;
      out += '<div class="service"><div class="service__num">0' + i + "</div><h3>" + esc(t(prefix + ".s" + i + "_t")) + "</h3><p>" + p + "</p></div>";
    }
    return '<div class="services n' + n + '">' + out + "</div>";
  }
  function beforeAfter(o) {
    return '<div class="ba" style="--pos:50%">' +
      '<div class="ba__img ba__before">' + (o.avant ? '<img src="' + esc(o.avant) + '" alt="">' : ph()) + "</div>" +
      '<div class="ba__img ba__after">' + (o.apres ? '<img src="' + esc(o.apres) + '" alt="">' : ph(true)) + "</div>" +
      '<span class="ba__label ba__label--before">' + esc(t("re.ba_before")) + "</span>" +
      '<span class="ba__label ba__label--after">' + esc(t("re.ba_after")) + "</span>" +
      '<span class="ba__line" aria-hidden="true"></span><span class="ba__handle" aria-hidden="true">‹ ›</span>' +
      '<input type="range" min="0" max="100" value="50" step="1" aria-label="' + esc(t("re.ba_label")) + '" aria-valuetext="50 %">' +
      "</div>";
  }
  function initBeforeAfter(root) {
    $$(".ba", root).forEach(function (ba) {
      var r = $("input", ba);
      r.addEventListener("input", function () {
        ba.style.setProperty("--pos", r.value + "%");
        r.setAttribute("aria-valuetext", t("re.ba_before") + " " + r.value + " % · " + t("re.ba_after") + " " + (100 - r.value) + " %");
      });
    });
  }

  /* ------------------------------------------------------------ filters (URL = Zustand) */
  function readFilters(defs) {
    var st = {};
    defs.forEach(function (d) { st[d.key] = param(d.key) || ""; });
    return st;
  }
  function writeFilters(st) {
    var u = new URL(location.href);
    Object.keys(st).forEach(function (k) { if (st[k]) u.searchParams.set(k, st[k]); else u.searchParams.delete(k); });
    history.replaceState(null, "", u);
  }
  function filtersHtml(defs, st, count) {
    return '<form class="filters" role="search" onsubmit="return false">' + defs.map(function (d) {
      if (d.kind === "select") {
        return '<div><label class="flabel" for="f-' + d.key + '">' + esc(d.legend) + "</label>" +
          '<select class="select" id="f-' + d.key + '" data-key="' + d.key + '"><option value="">' + esc(d.all) + "</option>" +
          d.options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (st[d.key] === o.v ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") +
          "</select></div>";
      }
      return '<fieldset><legend>' + esc(d.legend) + '</legend><div class="chips">' +
        [{ v: "", label: d.all }].concat(d.options).map(function (o) {
          return '<button type="button" class="chip" data-key="' + d.key + '" data-v="' + esc(o.v) + '" aria-pressed="' + (st[d.key] === o.v) + '">' + esc(o.label) + "</button>";
        }).join("") + "</div></fieldset>";
    }).join("") + '<p class="result-count" role="status" aria-live="polite">' + esc(count === 1 ? t("common.result") : t("common.results", { n: count })) + "</p></form>";
  }
  function bindFilters(root, st, onChange) {
    $$(".chip", root).forEach(function (b) {
      b.addEventListener("click", function () { st[b.dataset.key] = b.dataset.v; writeFilters(st); onChange(b); });
    });
    $$("select[data-key]", root).forEach(function (s) {
      s.addEventListener("change", function () { st[s.dataset.key] = s.value; writeFilters(st); onChange(s); });
    });
  }
  function refocus(el) {
    if (!el) return;
    var sel = el.tagName === "SELECT" ? "#" + el.id : '.chip[data-key="' + el.dataset.key + '"][data-v="' + el.dataset.v + '"]';
    var n = $(sel); if (n) n.focus();
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).sort(function (x, y) { return x.localeCompare(y); }); }

  /* ------------------------------------------------------------ Leaflet (lazy) */
  var leafletP;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletP) return leafletP;
    leafletP = new Promise(function (res, rej) {
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; document.head.appendChild(css);
      var s = document.createElement("script"); s.src = "vendor/leaflet/leaflet.js"; s.onload = function () { res(window.L); }; s.onerror = rej;
      document.head.appendChild(s);
    });
    return leafletP;
  }
  var LUX = [[49.44, 5.73], [50.19, 6.53]];
  function fitItems(L, map, items) {
    if (!items.length) return map.fitBounds(LUX);
    map.fitBounds(L.latLngBounds(items.map(function (i) { return [i.lat, i.lng]; })).pad(0.15), { maxZoom: 12 });
  }
  function baseMap(L, el, opts) {
    var map = L.map(el, Object.assign({ zoomSnap: 0.25, scrollWheelZoom: false, attributionControl: true }, opts || {}));
    // OSM-Standardkacheln, per CSS entsättigt (.leaflet-tile-pane). Kein API-Key.
    // ponytail: tile.openstreetmap.org ist für geringe Last gedacht; bei mehr Traffic eigener Tile-Cache (Phase 2).
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    cleanups.push(function () { map.remove(); });
    return map;
  }
  function markerIcon(L, group) {
    var projet = group.some(function (i) { return i.type === "projet"; });
    var closed = group.every(isClosed);
    return L.divIcon({
      className: "marker-wrap", iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -10],
      html: '<span class="marker marker--' + (projet ? "projet" : "bien") + (closed ? " marker--closed" : "") + '"></span>' +
        (group.length > 1 ? '<span class="marker-count">' + group.length + "</span>" : "")
    });
  }
  function popupHtml(group) {
    return group.map(function (it) {
      return '<a class="pop" href="' + url(it) + '">' + '<div style="position:relative">' + badge(it) + cardImg(it.images[0], "", "r-3x2") + "</div>" +
        '<div class="pop__body"><div class="card__place">' + esc(place(it)) + " · " + esc(t("status." + it.statut)) + "</div>" +
        '<div class="card__title">' + esc(it.titre) + '</div><span class="link-arrow">' + esc(t("common.discover")) + "</span></div></a>";
    }).join("");
  }
  /* Einträge mit gleicher Ortsmitte teilen sich eine Markierung (keine erfundenen Versätze) */
  function groupByPoint(items) {
    var g = {};
    items.forEach(function (it) { var k = it.lat + "," + it.lng; (g[k] = g[k] || []).push(it); });
    return Object.keys(g).map(function (k) { return g[k]; });
  }
  /* Karte gleitet so, dass Markierung + Fenster zusammen in der Mitte stehen (Leaflets autoPan schiebt nur knapp an den Rand) */
  function centerPopup(map, m, minZoom) {
    var el = m.getPopup().getElement(); if (!el) return;
    var z = Math.max(map.getZoom(), minZoom || 0), size = map.getSize(), h = el.offsetHeight;
    var y = size.y / 2 + h / 2 + 10;  // Markierung etwas unter der Mitte, Fenster darüber
    if (y - h - 25 < 10) y = h + 35;  // Fenster höher als die Karte: oben bündig
    var p = map.project(m.getLatLng(), z).add([0, size.y / 2 - y]);
    map.setView(map.unproject(p, z), z, { animate: !REDUCED, duration: 0.8 });
  }
  function addMarkers(L, map, items, onEach) {
    var layer = L.layerGroup().addTo(map);
    groupByPoint(items).forEach(function (group) {
      var label = group.length > 1 ? t("map.several", { n: group.length }) + " – " + group[0].localite : group[0].titre;
      var m = L.marker([group[0].lat, group[0].lng], { icon: markerIcon(L, group), title: label, alt: label, keyboard: true, autoPanOnFocus: false })
        .bindPopup(popupHtml(group), { maxWidth: 260, minWidth: 260, autoPan: false });
      m.on("popupopen", function () { centerPopup(map, m, m.minZoom); m.minZoom = 0; });
      m.addTo(layer);
      if (onEach) onEach(group, m);
    });
    return layer;
  }

  /* ------------------------------------------------------------ pages */
  var pages = {};

  /* Linien-Icons der vier Unternehmen, Strichstärke wie das Logo */
  // Lichtschein folgt der Maus in den Boxen (Startseite, DRP Senses)
  function spotlight(root) {
    $(".ventures", root).addEventListener("pointermove", function (e) {
      var el = e.target.closest(".venture"); if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }
  function ventureSvg(paths) {
    return '<svg class="venture__icon" viewBox="0 0 64 64" aria-hidden="true">' + paths.map(function (d) { return '<path pathLength="1" d="' + d + '"/>'; }).join("") + "</svg>";
  }
  var VENTURE_ICON = {
    luxembourg: ventureSvg(["M8 30 L32 10 L56 30", "M15 25 V54 H49 V25", "M23 41 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0", "M33 41 H44 M40 41 V45 M44 41 V44"]),
    "real-estate": ventureSvg(["M6 56 H58", "M14 56 V24 H32 V56", "M32 56 V10 H50 V56", "M19 32 H27 M19 40 H27 M19 48 H27", "M37 18 H45 M37 26 H45 M37 34 H45 M37 42 H45"]),
    senses: ventureSvg(["M8 56 H56", "M14 36 C14 26 20 22 28 22 H36 C44 22 50 26 50 36", "M10 36 H54 V44 H10 Z", "M16 44 V52 M48 44 V52", "M40 8 H52 V20 H40 Z M46 8 V20 M40 14 H52"]),
    architecture: ventureSvg(["M8 56 H56", "M32 13 L19 50 M32 13 L45 50", "M29 10 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", "M23 39 Q32 45 41 39"])
  };

  pages.home = function (main) {
    var aff = D.items.filter(function (i) { return i.a_laffiche; }).slice(0, 3);
    main.innerHTML =
      '<section class="section" id="bereiche" aria-labelledby="h-tiles"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow">DRP Group</span><h2 class="h-section" id="h-tiles">' + esc(t("home.tiles_title")) + "</h2></div></div>" +
      '<div class="ventures">' + D.bereiche.map(function (b, i) {
        var meta = t("common.discover");
        return '<a class="venture" href="' + b.page + '"><span class="venture__fill" aria-hidden="true"></span>' +
          '<span class="venture__top"><span class="venture__num" aria-hidden="true">0' + (i + 1) + "</span>" + (VENTURE_ICON[b.id] || "") + "</span>" +
          '<span class="venture__body"><span class="venture__name">' + esc(b.nom) + '</span><span class="venture__line">' + esc(t("bereich." + b.id + ".line")) + "</span></span>" +
          '<span class="venture__meta"><span>' + esc(meta) + '</span><span class="venture__arrow" aria-hidden="true">→</span></span></a>';
      }).join("") + "</div></div></section>" +

      /* À l'affiche – Aufbau wie kretzrealestate.com (Hauptbild, angeschnittene Nachbarbilder, Karte, Bild-Punkte) */
      '<section class="fpc-section" aria-labelledby="h-aff"><h2 class="fpc-section__heading" id="h-aff">' + esc(t("home.affiche_title")) + "</h2>" +
      '<div class="fpc" role="region" aria-roledescription="carousel" aria-label="' + esc(t("home.affiche_title")) + '" tabindex="0">' +
      '<div class="fpc__viewport"><button type="button" class="fpc__side fpc__side--prev" aria-label="' + esc(t("common.previous")) + '"><img alt=""></button>' +
      '<div class="fpc__gutter" aria-hidden="true"></div><div class="fpc__main"></div><div class="fpc__gutter" aria-hidden="true"></div>' +
      '<button type="button" class="fpc__side fpc__side--next" aria-label="' + esc(t("common.next")) + '"><img alt=""></button></div>' +
      '<div class="fpc__cardslot"></div>' +
      // Pause-Knopf nur bei Tastaturbedienung sichtbar (WCAG 2.2.2); Maus: Anhalten beim Drüberfahren
      '<button type="button" class="fpc__play" aria-pressed="false" aria-label="' + esc(t("arch.film_pause")) + '"></button></div>' +
      '<div class="fpc-section__cta"><a class="fpc-section__all" href="biens.html">' + esc(t("common.all_properties")) +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></a></div></section>' +

      '<section class="section" aria-labelledby="h-map"><div class="wrap"><div class="section-head"><div><span class="eyebrow">' + esc(t("home.map_eyebrow")) + "</span>" +
      '<h2 class="h-section" id="h-map">' + esc(t("home.map_title")) + "</h2><p>" + esc(t("home.map_text")) + "</p></div>" +
      '<a class="link-arrow" href="carte.html">' + esc(t("home.map_cta")) + "</a></div>" +
      '<div class="map-preview" id="map-preview" role="img" aria-label="' + esc(t("map.region")) + '"></div></div></section>' +

      '<section class="section section--tight" aria-labelledby="h-who"><div class="wrap"><div class="split">' +
      "<div><span class=\"eyebrow\">" + esc(t("home.who_eyebrow")) + '</span><h2 class="h-section" id="h-who">' + esc(t("home.who_title")) + "</h2></div>" +
      '<div><p class="lead">' + esc(t("home.who_text")) + '</p><a class="link-arrow" href="about.html">' + esc(t("home.who_cta")) + "</a></div>" +
      "</div></div></section>" +

      '<section class="quote"><div class="wrap"><blockquote lang="en"><p>' + esc(D.site.citation.texte) + "</p></blockquote><cite>" + esc(D.site.citation.auteur) + "</cite></div></section>" +
      ctaBand();

    initAffiche(main, aff);
    spotlight(main);
    var mp = $("#map-preview");
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      loadLeaflet().then(function (L) {
        if (!document.body.contains(mp)) return;
        var map = baseMap(L, mp, { dragging: !L.Browser.mobile, zoomControl: false, keyboard: false });
        fitItems(L, map, D.items);
        addMarkers(L, map, D.items);
      });
    }, { rootMargin: "300px" });
    io.observe(mp);
    cleanups.push(function () { io.disconnect(); });
  };

  function initAffiche(root, aff) {
    var box = $(".fpc", root);
    if (!box || !aff.length) return;
    var n = aff.length, k = 0;
    var ARROW = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    // altes Element gleitet hinaus, neues herein (dir 1 = nach links, -1 = nach rechts, 0 = ohne Bewegung)
    function swap(parent, html, dir) {
      $$(".is-leaving", parent).forEach(function (el) { el.remove(); });
      var old = parent.firstElementChild, tmp = document.createElement("div");
      tmp.innerHTML = html;
      var el = tmp.firstElementChild;
      if (!old || !dir) { parent.innerHTML = ""; parent.appendChild(el); return; }
      el.style.setProperty("--dir", dir);
      el.classList.add("is-entering");
      parent.appendChild(el);
      void el.offsetWidth;
      el.classList.remove("is-entering");
      old.style.setProperty("--dir", dir);
      old.classList.add("is-leaving");
      setTimeout(function () { old.remove(); }, 1200);
    }
    function show(i, dir) {
      k = (i + n) % n;
      var it = aff[k], prev = aff[(k - 1 + n) % n], next = aff[(k + 1) % n];
      var stats = [surfaceText(it), bedroomsText(it), it.unites_total ? t("fmt.units", { n: it.unites_total }) : ""].filter(Boolean);
      swap($(".fpc__main", box), '<a class="fpc__link fpc__slide" href="' + url(it) + '" tabindex="-1">' +
        '<img class="fpc__img fpc__img--ken" src="' + esc(it.images[0] || "") + '" alt="' + esc(it.titre) + '"></a>', dir);
      $(".fpc__side--prev img", box).src = prev.images[0] || "";
      $(".fpc__side--next img", box).src = next.images[0] || "";
      $$(".fpc__side img", box).forEach(function (im) { im.style.animation = "none"; void im.offsetWidth; im.style.animation = ""; });
      swap($(".fpc__cardslot", box), '<a class="fpc__card fpc__card--link' + (dir ? " fpc__card--enter" : "") + '" href="' + url(it) + '">' +
        '<div class="fpc__meta"><span class="fpc__city">' + esc(it.localite) + '</span><span class="fpc__price">' + esc(priceText(it)) + "</span></div>" +
        '<h3 class="fpc__title">' + esc(it.titre) + "</h3>" +
        '<div class="fpc__stats"><div class="fpc__stats-main">' + stats.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join('<span class="fpc__sep"></span>') + "</div>" +
        "</div></a>", dir); // ohne Pfeil: sah aus wie „weiterblättern“
      tick();
    }
    // läuft von selbst weiter; Pause per Knopf, beim Drüberfahren/Fokus, außerhalb des Bildschirms; nicht bei „weniger Bewegung“
    var DELAY = 4000, timer, stopped = REDUCED || !!window.DRP_EDIT, held = false, seen = false;
    var play = $(".fpc__play", box);
    function tick() { clearTimeout(timer); if (!stopped && !held && seen && !document.hidden) timer = setTimeout(function () { show(k + 1, 1); }, DELAY); }
    function setStopped(v) {
      stopped = v; play.setAttribute("aria-pressed", String(v));
      play.setAttribute("aria-label", t(v ? "arch.film_play" : "arch.film_pause")); tick();
    }
    play.addEventListener("click", function () { setStopped(!stopped); });
    box.addEventListener("mouseenter", function () { held = true; tick(); });
    box.addEventListener("mouseleave", function () { held = box.contains(document.activeElement); tick(); });
    box.addEventListener("focusin", function () { held = true; tick(); });
    box.addEventListener("focusout", function (e) { held = box.contains(e.relatedTarget) || box.matches(":hover"); tick(); });
    document.addEventListener("visibilitychange", tick);
    new IntersectionObserver(function (es) { seen = es[0].isIntersecting; tick(); }, { threshold: 0.5 }).observe(box);
    $(".fpc__side--prev", box).addEventListener("click", function () { show(k - 1, -1); });
    $(".fpc__side--next", box).addEventListener("click", function () { show(k + 1, 1); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(k + 1, 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(k - 1, -1); }
    });
    // Wischen auf dem Handy
    var sx = null;
    box.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(k + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    show(0);
  }

  /* DRP Senses: Einleitung, vier Boxen (Möbel, Fliesen, Baustoffe, Bauarbeiten auf Anfrage) (wie „Unsere Unternehmen“), Wortband, das beim Scrollen gleitet */
  var SENSES_ICON = [
    VENTURE_ICON.senses,
    ventureSvg(["M10 10 H54 V54 H10 Z", "M10 32 H54", "M32 10 V54"]),
    ventureSvg(["M32 8 L54 20 V44 L32 56 L10 44 V20 Z", "M10 20 L32 32 L54 20", "M32 32 V56", "M21 14 L43 26 V34"]),
    ventureSvg(["M8 30 L32 10 L56 30", "M15 25 V54 H49 V25", "M27 54 V40 H37 V54"])
  ];
  function sensesBody() {
    // zwei Zeilen ohne gemeinsame Wörter → nie dasselbe Wort übereinander; das mittlere Wort der mittleren Kopie steht in der Bildmitte
    var line = function (key, cls) {
      var w = t(key).split(" · "), mid = w.length + Math.floor(w.length / 2);
      return '<div class="senses-words__line ' + cls + '">' + w.concat(w, w).map(function (x, i) { return "<span" + (i === mid ? " data-anchor" : "") + ">" + esc(x) + "</span>"; }).join("") + "</div>";
    };
    return '<section class="section senses-intro"><div class="wrap"><div class="split">' +
      '<div><span class="eyebrow">DRP Senses</span><h2 class="h-section">' + esc(t("bereich.senses.line")) + "</h2></div>" +
      '<p class="lead">' + esc(t("senses.intro")) + "</p></div></div></section>" +
      '<section class="section section--tight" style="padding-top:0"><div class="wrap"><h2 class="visually-hidden">' + esc(t("page.services")) + "</h2>" +
      '<div class="ventures ventures--static">' + SENSES_ICON.map(function (icon, i) {
        var n = i + 1;
        return '<div class="venture">' +
          '<span class="venture__top"><span class="venture__num" aria-hidden="true">0' + n + "</span>" + icon + "</span>" +
          '<span class="venture__body"><span class="venture__name">' + esc(t("senses.s" + n + "_t")) + "</span></span></div>";
      }).join("") + "</div></div></section>" +
      '<section class="senses-words" aria-hidden="true">' + line("senses.words", "") + line("senses.words2", "senses-words__line--rev") + "</section>";
  }
  function initSenses(root) {
    var band = $(".senses-words", root), lines = $$(".senses-words__line", root), raf = 0;
    var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function place(i, p) { // p = 0.5 → Ankerwort genau in der Mitte
      var a = $("[data-anchor]", lines[i]);
      var x = band.clientWidth / 2 - a.offsetLeft - a.offsetWidth / 2 + (i ? 1 : -1) * (p - 0.5) * band.clientWidth * 0.5;
      lines[i].style.transform = "translateX(" + x + "px)";
    }
    function move() {
      raf = 0;
      var r = band.getBoundingClientRect(), p = still ? 0.5 : (innerHeight - r.top) / (innerHeight + r.height); // 0 → 1 während das Band durchs Bild läuft
      p = Math.min(1, Math.max(0, p));
      place(0, p); place(1, p);
    }
    function queue() { if (!raf) raf = requestAnimationFrame(move); }
    if (!still) addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    move();
  }

  pages.bereich = function (main) {
    var b = bereich(body.dataset.bereich);
    var list = b.liste ? D.items.filter(function (i) { return i.type === b.liste.type && i.bereich === b.liste.bereich; }) : [];
    var html =
      pageHead(b.hero, b.nom, t("bereich." + b.id + ".line"));

    if (b.id === "luxembourg") html += intro(t("lux.intro")) + servicesSection(services("lux", 4));
    if (b.id === "real-estate") {
      var ba = (D.avant_apres || [])[0];
      html += intro(t("re.intro")) + servicesSection(services("re", 3)) +
        // Vorher/Nachher nur mit echten Fotos (data.js → avant_apres), sonst kein Block mit „Foto folgt“
        (ba && ba.avant && ba.apres ? '<section class="section section--off"><div class="wrap"><div class="split">' +
        '<div><span class="eyebrow">' + esc(t("page.before_after")) + '</span><h2 class="h-section">' + esc(t("re.s1_t")) + "</h2></div>" +
        beforeAfter(ba) + "</div></div></section>" : "");
    }
    if (b.id === "senses") html += sensesBody();
    if (b.id === "architecture") {
      var a = D.architecture;
      html += intro(t("arch.intro")) + servicesSection(services("arch", 3)) + archGallery(D.architecture, b.site);
    }
    if (list.length) {
      var isB = b.liste.type === "bien";
      html += '<section class="section"><div class="wrap"><div class="section-head"><h2 class="h-section">' + esc(t(isB ? "page.our_properties" : "page.our_projects")) + "</h2>" +
        '<a class="link-arrow" href="' + (isB ? "biens.html" : "projets.html") + '">' + esc(t(isB ? "common.all_properties" : "common.all_projects")) + "</a></div>" +
        '<div class="grid">' + list.slice(0, 6).map(card).join("") + "</div></div></section>";
    }
    if (b.contact) html += contactCard(b.contact);
    html += ctaBand();
    main.innerHTML = html;
    initBeforeAfter(main);
    if (b.id === "architecture") initArchitecture(main, D.architecture);
    if (b.id === "senses") initSenses(main);
    document.title = b.nom + " – DRP Group";
  };
  /* ------------------------------------------------------------ DRP Architecture: Fotogalerie */
  // Bildwand im Blocksatz: jedes Foto in seinem echten Seitenverhältnis (--r), Reihen füllen die Breite
  function archGallery(a, site) {
    return '<section class="section arch-gal-sec" aria-labelledby="h-arch-gal"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow">' + esc(t("arch.film_eyebrow", { n: a.photos.length })) + '</span><h2 class="h-section" id="h-arch-gal">' + esc(t("arch.film_title")) + "</h2></div>" +
      '<a class="btn" href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(t("arch.visit")) + '<span class="visually-hidden"> (' + esc(t("common.opens_new")) + ")</span></a></div>" +
      (a.film && a.film.mp4 ? '<div class="arch-film-v"><video muted loop playsinline preload="none" poster="' + esc(a.film.poster) + '" aria-label="' + esc(t("arch.film_label")) + '">' +
        (a.film.webm ? '<source src="' + esc(a.film.webm) + '" type="video/webm">' : "") + '<source src="' + esc(a.film.mp4) + '"' + (/^blob:/.test(a.film.mp4) ? "" : ' type="video/mp4"') + "></video>" +
        '<button type="button" class="arch-film-v__toggle" aria-pressed="false">' + esc(t("arch.film_pause")) + "</button></div>" : "") +
      '<ul class="arch-wall">' + a.photos.map(function (ph, k) {
        return '<li style="--r:' + ph.ratio + '"><button type="button" class="arch-tile" data-k="' + k + '" aria-label="' + esc(t("detail.photo_n", { n: k + 1 })) + '">' +
          '<img src="' + esc(ph.image) + '" alt="" loading="lazy" decoding="async"><span class="arch-tile__num" aria-hidden="true">' + String(k + 1).padStart(2, "0") + "</span></button></li>";
      }).join("") + "</ul></div></section>" +
      '<dialog class="arch-cine" aria-label="' + esc(t("arch.film_title")) + '">' +
      '<button type="button" class="arch-cine__close" data-cine="close">' + esc(t("common.close")) + " ✕</button>" +
      '<div class="arch-cine__stage"><button type="button" class="arch-cine__arrow" data-cine="-1" aria-label="' + esc(t("common.previous")) + '">' + ICON.prev + "</button>" +
      '<img class="arch-cine__img" alt=""><button type="button" class="arch-cine__arrow" data-cine="1" aria-label="' + esc(t("common.next")) + '">' + ICON.next + "</button></div>" +
      '<div class="arch-cine__bar"><span class="arch-cine__count" aria-live="polite"></span><div class="arch-cine__thumbs">' + a.photos.map(function (ph, k) {
        return '<button type="button" data-k="' + k + '" aria-label="' + esc(t("detail.photo_n", { n: k + 1 })) + '"><img src="' + esc(ph.image) + '" alt="" loading="lazy"></button>';
      }).join("") + "</div></div></dialog>";
  }
  function initArchitecture(root, a) {
    /* Film: startet erst sichtbar, Pause-Knopf (WCAG 2.2.2), bei reduzierter Bewegung nur Standbild */
    var fv = $(".arch-film-v video", root), fb = $(".arch-film-v__toggle", root);
    if (fv) {
      var wantPlay = !REDUCED;
      function label() { fb.textContent = t(fv.paused ? "arch.film_play" : "arch.film_pause"); fb.setAttribute("aria-pressed", String(fv.paused)); }
      fb.addEventListener("click", function () { wantPlay = fv.paused; if (fv.paused) fv.play(); else fv.pause(); });
      fv.addEventListener("play", label); fv.addEventListener("pause", label);
      var vio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && wantPlay) fv.play().catch(function () {}); else if (!es[0].isIntersecting) fv.pause();
      }, { threshold: 0.35 });
      vio.observe(fv); cleanups.push(function () { vio.disconnect(); });
      label();
    }
    var dlg = $(".arch-cine", root), im = $(".arch-cine__img", dlg), n = a.photos.length, k = 0;
    function show(i) {
      k = (i + n) % n;
      im.classList.remove("is-in"); void im.offsetWidth;
      im.src = a.photos[k].image; im.alt = t("detail.photo_n", { n: k + 1 });
      im.classList.add("is-in");
      $(".arch-cine__count", dlg).textContent = String(k + 1).padStart(2, "0") + " / " + n;
      $$(".arch-cine__thumbs button", dlg).forEach(function (b) {
        var on = +b.dataset.k === k; b.setAttribute("aria-current", String(on));
        if (on) b.scrollIntoView({ block: "nearest", inline: "center", behavior: REDUCED ? "auto" : "smooth" });
      });
      if (!dlg.open) dlg.showModal();
    }
    $$(".arch-tile", root).forEach(function (b) { b.addEventListener("click", function () { show(+b.dataset.k); }); });
    $$(".arch-cine__thumbs button", dlg).forEach(function (b) { b.addEventListener("click", function () { show(+b.dataset.k); }); });
    $$("[data-cine]", dlg).forEach(function (b) {
      b.addEventListener("click", function () { if (b.dataset.cine === "close") dlg.close(); else show(k + +b.dataset.cine); });
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") show(k + 1);
      if (e.key === "ArrowLeft") show(k - 1);
    });
    var sx = null;
    dlg.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(k + (dx < 0 ? 1 : -1));
    });
  }

  function intro(text, extra) {
    return '<section class="section section--tight"><div class="wrap wrap--narrow"><p class="lead">' + esc(text) + "</p>" + (extra ? "<p>" + extra + "</p>" : "") + "</div></section>";
  }
  function servicesSection(inner) {
    return '<section class="section section--tight" style="padding-top:0"><div class="wrap"><h2 class="visually-hidden">' + esc(t("page.services")) + "</h2>" + inner + "</div></section>";
  }

  /* Kopfbild als Diashow: alle 4 s weich überblenden, Endlosschleife; steht still bei „Bewegung reduzieren“
     und wenn der Tab im Hintergrund ist. Die Stelle merkt sich headIdx, damit ein Filterwechsel nicht von vorn beginnt. */
  var headIdx = 0;
  function initHeadSlides(root) {
    var box = $(".page-head__img[data-slides]", root);
    if (!box || REDUCED) return;
    var imgs = $$(".ph-slide", box), n = imgs.length;
    function load(i) { var im = imgs[i]; if (im && !im.getAttribute("src")) im.src = im.getAttribute("data-src"); }
    function show(i) {
      headIdx = (i + n) % n; load(headIdx);
      imgs.forEach(function (im, k) { im.classList.toggle("is-on", k === headIdx); });
      load((headIdx + 1) % n); // nächstes schon laden
    }
    if (headIdx) show(headIdx); else load(1);
    var timer = setInterval(function () {
      if (!box.isConnected) { clearInterval(timer); return; }
      if (document.hidden) return;
      var next = (headIdx + 1) % n, im = imgs[next];
      if (im.complete && im.naturalWidth) show(next); else load(next); // erst zeigen, wenn geladen
    }, 4000);
    cleanups.push(function () { clearInterval(timer); });
  }
  // je Projekt nur ein Foto (mehrere Wohnungen desselben Projekts zeigen sonst dasselbe Bild)
  function headPhotos(list) {
    var seen = {}, out = [];
    list.forEach(function (it) {
      var key = it.projet || it.id; if (seen[key]) return; seen[key] = 1;
      var parent = it.projet && byId(it.projet), src = (parent && parent.images[0]) || it.images[0];
      if (src && out.indexOf(src) < 0) out.push(src);
    });
    return out;
  }

  function listPage(main, type) {
    var all = D.items.filter(function (i) { return i.type === type; });
    var isB = type === "bien";
    var defs = [];
    if (isB) defs.push({ key: "type", kind: "chips", legend: t("list.f_type"), all: t("list.f_all"), options: uniq(all.map(function (i) { return i.categorie; })).map(function (c) { return { v: c, label: t("cat." + c) }; }) });
    defs.push({ key: "statut", kind: "chips", legend: t("list.f_status"), all: t("list.f_all"),
      options: (isB ? ["a-vendre", "a-louer", "vendu", "loue"] : ["en-cours", "realise", "vendu"]).map(function (s) { return { v: s, label: t("status." + s) }; }) });
    if (isB) defs.push({ key: "bereich", kind: "chips", legend: t("list.f_origin"), all: t("list.f_all"), options: [{ v: "real-estate", label: t("list.origin_dev") }, { v: "luxembourg", label: t("list.origin_agency") }] });
    defs.push({ key: "commune", kind: "select", legend: t("list.f_commune"), all: t("list.all_communes"), options: uniq(all.map(function (i) { return i.localite; })).map(function (c) { return { v: c, label: c }; }) });
    var st = readFilters(defs);
    function draw(focusEl) {
      var res = all.filter(function (i) {
        return (!st.type || i.categorie === st.type) && (!st.statut || i.statut === st.statut) && (!st.bereich || i.bereich === st.bereich) && (!st.commune || i.localite === st.commune);
      });
      main.innerHTML = pageHead(headPhotos(all), t(isB ? "nav.properties" : "nav.projects")) + // Diashow der Immobilien bzw. Projekte
        '<div class="wrap"><div class="page-intro">' +
        '<p class="lead">' + esc(t(isB ? "list.properties_lead" : "list.projects_lead")) + "</p></div>" +
        filtersHtml(defs, st, res.length) +
        (res.length ? '<div class="grid">' + res.map(card).join("") + "</div>"
          : '<p class="empty">' + esc(t("common.none")) + ' <a href="' + location.pathname.split("/").pop() + '">' + esc(t("common.reset")) + "</a></p>") +
        '</div><div style="height:clamp(64px,10vw,140px)"></div>' + ctaBand();
      bindFilters(main, st, function (el) { draw(el); });
      initHeadSlides(main);
      refocus(focusEl);
    }
    draw();
  }
  pages.biens = function (main) { listPage(main, "bien"); };

  /* Merkliste mit Vergleich (bis 3). ?ids=a,b,c = geteilte Liste */
  pages.merkliste = function (main) {
    var shared = param("ids") ? param("ids").split(",").filter(function (id) { return byId(id); }) : null;
    var ids = shared || favGet().filter(function (id) { return byId(id); });
    var sel = ids.slice(0, 3);
    function row(label, fn) { return "<tr><th scope=\"row\">" + esc(label) + "</th>" + sel.map(function (id) { var v = fn(byId(id)); return "<td>" + (v ? esc(v) : '<span class="muted">' + esc(t("fav.na")) + "</span>") + "</td>"; }).join("") + "</tr>"; }
    function compare() {
      if (sel.length < 2) return '<p class="muted">' + esc(t("fav.compare_hint")) + "</p>";
      return '<div class="cmp-scroll"><table class="cmp" style="--n:' + sel.length + '"><caption class="visually-hidden">' + esc(t("fav.compare_title")) + "</caption><thead><tr><td></td>" +
        sel.map(function (id) { var it = byId(id); return '<th scope="col"><a href="' + url(it) + '">' + img(it.images[0], "", "r-3x2") + "<span>" + esc(it.titre) + "</span></a></th>"; }).join("") + "</tr></thead><tbody>" +
        row(t("fav.row_price"), priceText) + row(t("fav.row_surface"), surfaceText) + row(t("fav.row_rooms"), function (it) { return it.chambres || ""; }) +
        row(t("fav.row_place"), place) + row(t("fav.row_energy"), function (it) { return it.energie || ""; }) +
        row(t("fav.row_status"), function (it) { return t("status." + it.statut); }) + row(t("fav.row_avail"), function (it) { return availabilityText(it.disponibilite); }) +
        "</tbody></table></div>";
    }
    var listUrl = shareUrl("merkliste.html?ids=" + ids.map(encodeURIComponent).join(","));
    // Kopf: die gemerkten Objekte wechseln sich ab (je Projekt ein Foto); leere Merkliste: alle Immobilien
    var favPhotos = headPhotos(ids.map(byId));
    main.innerHTML = pageHead(favPhotos.length ? favPhotos : headPhotos(D.items.filter(function (i) { return i.type === "bien"; })), t("fav.title")) + '<div class="wrap fav-page">' +
      '<div class="page-intro"><p class="lead">' + esc(t(shared ? "fav.shared_lead" : "fav.lead")) + "</p>" +
      (shared && ids.length ? '<button type="button" class="btn" data-add-all>' + ICON.heart + " " + esc(t("fav.add_all")) + "</button>" : "") + "</div>" +
      (ids.length ?
        '<div class="grid fav-grid">' + ids.map(function (id) {
          return '<div class="fav-item">' + card(byId(id)) + (ids.length > 1 ? '<label class="fav-cmp"><input type="checkbox" data-cmp="' + esc(id) + '"' + (sel.indexOf(id) > -1 ? " checked" : "") + "> " + esc(t("fav.compare")) + "</label>" : "") + "</div>";
        }).join("") + "</div>" +
        // Vergleich unter den gemerkten Objekten
        (ids.length > 1 ? '<section class="fav-cmp-sec" aria-labelledby="h-cmp"><h2 class="h-small" id="h-cmp">' + esc(t("fav.compare_title")) + '</h2><div data-cmp-out>' + compare() + "</div></section>" : "") +
        (shared ? "" : shareBox(listUrl, t("share.list_msg"), t("fav.title") + " – DRP Group"))
        : '<div class="fav-empty"><p>' + esc(t("fav.empty")) + '</p><a class="btn" href="biens.html">' + esc(t("fav.browse")) + "</a></div>") +
      '</div><div style="height:clamp(64px,10vw,140px)"></div>';
    $$("[data-cmp]", main).forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-cmp");
        if (cb.checked && sel.length >= 3) { cb.checked = false; $("[data-cmp-out]", main).insertAdjacentHTML("afterbegin", '<p class="cmp-max" role="status">' + esc(t("fav.max3")) + "</p>"); return; }
        sel = cb.checked ? sel.concat(id) : sel.filter(function (x) { return x !== id; });
        sel = ids.filter(function (x) { return sel.indexOf(x) > -1; }); // Reihenfolge wie in der Liste
        $("[data-cmp-out]", main).innerHTML = compare();
      });
    });
    headIdx = 0; initHeadSlides(main);
    var add = $("[data-add-all]", main);
    if (add) add.addEventListener("click", function () {
      var list = favGet(); ids.forEach(function (id) { if (list.indexOf(id) < 0) list.push(id); }); favSet(list); favSync();
      add.textContent = t("fav.added"); add.disabled = true;
    });
  };
  pages.projets = function (main) { listPage(main, "projet"); };

  pages.carte = function (main) {
    var defs = [
      { key: "type", kind: "chips", legend: t("map.f_what"), all: t("type.tous"), options: [{ v: "biens", label: t("type.biens") }, { v: "projets", label: t("type.projets") }] },
      { key: "statut", kind: "chips", legend: t("map.f_status"), all: t("list.f_all"), options: ["a-vendre", "a-louer", "vendu", "en-cours", "realise"].map(function (s) { return { v: s, label: t("status." + s) }; }) }
    ];
    var st = readFilters(defs);
    var view = "map"; // Handy: Karte zuerst, Liste per Knopf
    main.innerHTML = pageHead(D.site.entetes.carte, t("nav.map")) +
      '<div class="wrap"><div id="map-filters"></div>' +
      '<div class="map-toggle chips" role="group"><button type="button" class="chip" data-view="map" aria-pressed="true">' + esc(t("map.show_map")) + "</button>" +
      '<button type="button" class="chip" data-view="list" aria-pressed="false">' + esc(t("map.show_list")) + "</button></div>" +
      '<div class="map-layout" data-view="map"><div class="map-list" id="map-list"></div>' +
      '<div class="map-pane"><div id="map" role="region" aria-label="' + esc(t("map.region")) + '"></div>' +
      '<p class="map-note"><span class="marker marker--bien" style="display:inline-block;vertical-align:-2px"></span> ' + esc(t("map.legend_bien")) +
      ' &nbsp; <span class="marker marker--projet" style="display:inline-block;vertical-align:-1px;margin-left:6px"></span>&nbsp; ' + esc(t("map.legend_projet")) +
      " &nbsp;·&nbsp; " + esc(t("common.approx")) + "</p></div></div></div>";

    var layout = $(".map-layout", main);
    var map, L, layer, markers = {}, fitted = false;
    $$(".map-toggle .chip", main).forEach(function (b) {
      b.addEventListener("click", function () { setView(b.dataset.view); });
    });
    function setView(v) {
      view = v; layout.dataset.view = v;
      $$(".map-toggle .chip", main).forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.view === v)); });
      // war die Karte beim Laden versteckt (Handy, Listenansicht), Ausschnitt beim ersten Zeigen neu setzen
      if (map) setTimeout(function () { map.invalidateSize(); if (v === "map" && !fitted) { fitItems(L, map, D.items); fitted = true; } }, 0);
    }
    function filtered() {
      return D.items.filter(function (i) {
        return (!st.type || (st.type === "biens" ? i.type === "bien" : i.type === "projet")) && (!st.statut || i.statut === st.statut);
      });
    }
    function draw(focusEl) {
      var res = filtered();
      $("#map-filters").innerHTML = filtersHtml(defs, st, res.length);
      bindFilters($("#map-filters"), st, function (el) { draw(el); });
      refocus(focusEl);
      $("#map-list").innerHTML = res.length ? "<ol>" + res.map(function (it) {
        return '<li><div class="map-row" data-id="' + esc(it.id) + '">' + '<a href="' + url(it) + '" style="position:relative">' + badge(it) + cardImg(it.images[0], "", "r-4x5") + "</a>" +
          '<div><div class="card__place">' + esc(place(it)) + " · " + esc(t("status." + it.statut)) + "</div>" +
          '<a class="card__title" style="display:block;text-decoration:none" href="' + url(it) + '">' + esc(it.titre) + "</a>" +
          '<div class="card__meta">' + esc(metaLine(it)) + '</div><div class="card__price">' + esc(priceText(it)) + "</div>" +
          '<button type="button" class="link-arrow" data-pin="' + esc(it.id) + '" style="background:none;border:0;border-bottom:1px solid;cursor:pointer;margin-top:8px">' + esc(t("common.view_map")) + "</button></div></div></li>";
      }).join("") + "</ol>" : '<p class="empty">' + esc(t("common.none")) + "</p>";
      $$("[data-pin]", main).forEach(function (b) {
        b.addEventListener("click", function () {
          var m = markers[b.dataset.pin];
          if (!m) return;
          setView("map");
          setTimeout(function () { // nach setView: Kartengröße am Handy erst dann bekannt
            m.minZoom = 12; // nah heranzoomen, Mitte setzt centerPopup
            if (m.isPopupOpen()) centerPopup(map, m, 12); else m.openPopup();
            var el = m.getElement(); if (el) el.focus({ preventScroll: true });
          }, 0);
        });
      });
      if (map) plot(res);
    }
    function plot(res) {
      if (layer) layer.remove();
      markers = {};
      layer = addMarkers(L, map, res, function (group, m) { group.forEach(function (it) { markers[it.id] = m; }); });
    }
    draw();
    var mapEl = $("#map", main);
    loadLeaflet().then(function (lf) {
      L = lf;
      if (!document.body.contains(mapEl)) return;
      map = baseMap(L, mapEl, { scrollWheelZoom: true });
      fitItems(L, map, D.items);
      fitted = $("#map").offsetWidth > 0;
      plot(filtered());
    });
  };

  function detailPage(main, type) {
    var it = byId(param("id"));
    var isP = type === "projet";
    if (!it || it.type !== type) {
      main.innerHTML = '<div class="wrap section"><h1 class="h-section">' + esc(t("detail.not_found")) + '</h1><p style="margin-top:24px"><a class="link-arrow" href="' + (isP ? "projets.html" : "biens.html") + '">' + esc(t(isP ? "detail.back_projects" : "detail.back_props")) + "</a></p></div>";
      return;
    }
    document.title = it.titre + " – DRP Group";
    var imgs = it.images.length ? it.images : [null];
    var parent = it.projet ? byId(it.projet) : null;
    var kids = isP ? children(it) : [];
    var desc = txt(it.description);
    var b = bereich(it.bereich);

    var facts = [];
    function f(k, v) { if (v) facts.push("<li><span>" + esc(t(k)) + "</span><span>" + esc(v) + "</span></li>"); }
    f("detail.status", t("status." + it.statut));
    if (!isP) f(it.statut === "a-louer" ? "detail.rent" : "detail.price", priceText(it));
    f("detail.surface", surfaceText(it));
    f("detail.bedrooms", it.chambres);
    f("detail.units", it.unites_total ? String(it.unites_total) : "");
    f("detail.sales", it.vente ? t("fmt.sold_of", { v: it.vente }) : "");
    f("detail.year", it.annee);
    f("detail.availability", availabilityText(it.disponibilite));
    f("detail.energy", it.energie);
    f("detail.location", place(it));

    // Video-Slot: ist `video` gesetzt, ersetzt es oben das erste Foto; die Fotos bleiben in der Galerie
    var videoHtml = isP && it.video ? '<video muted loop playsinline ' + (REDUCED ? "controls" : "autoplay") + ' poster="' + esc(it.video_poster || imgs[0] || "") + '" src="' + esc(it.video) + '" aria-label="' + esc(it.titre) + '"></video>' : "";
    var mediaHtml = '<div class="gallery" role="region" aria-roledescription="carousel" aria-label="' + esc(t("detail.gallery")) + '" tabindex="0">' +
        '<div class="gallery__main" style="position:relative">' + badge(it) + favBtn(it) + '<div class="ratio r-3x2" id="g-main">' +
        (videoHtml || (imgs[0] ? '<img src="' + esc(imgs[0]) + '" alt="' + esc(it.titre + " – " + t("detail.photo_n", { n: 1 })) + '" fetchpriority="high">' : ph())) + "</div>" +
        (imgs.length > 1 ? '<span class="gallery__count" aria-live="polite">1 / ' + imgs.length + "</span>" +
          '<div class="gallery__nav"><button type="button" class="icon-btn" data-g="-1" aria-label="' + esc(t("common.previous")) + '">' + ICON.prev + "</button>" +
          '<button type="button" class="icon-btn" data-g="1" aria-label="' + esc(t("common.next")) + '">' + ICON.next + "</button></div>" : "") +
        "</div>" +
        (imgs.length > 1 ? '<div class="thumbs">' + imgs.map(function (src, i) {
          return '<button type="button" data-i="' + i + '" aria-label="' + esc(t("detail.photo_n", { n: i + 1 })) + '"' + (i === 0 ? ' aria-current="true"' : "") + ">" + img(src, "", "r-3x2") + "</button>";
        }).join("") + "</div>" : "") + "</div>";

    var unitsHtml = "";
    if (isP && (kids.length || it.unites.length)) {
      // Einheitenliste nur, wenn nicht schon jede Einheit unten als Bien verlinkt ist
      unitsHtml = kids.length >= it.unites.length ? "" : '<h2 class="h-small" style="margin:48px 0 16px">' + esc(t("detail.units_title")) + '</h2><ul class="units">' +
        it.unites.map(function (u) { return '<li><span class="u">' + esc(u) + "</span></li>"; }).join("") + "</ul>";
      if (kids.length) {
        unitsHtml += '<h2 class="h-small" style="margin:40px 0 16px">' + esc(t("detail.available_units")) + '</h2><ul class="units">' + kids.map(function (k) {
          return '<li><a href="' + url(k) + '"><span class="u-name">' + esc(k.titre.split(" – ")[0]) + " · " + esc(metaLine(k)) + '</span><span class="u-price">' + esc(priceText(k)) + "</span></a></li>";
        }).join("") + "</ul>";
      }
    }
    var ba = it.avant || it.apres ? '<h2 class="h-small" style="margin:48px 0 16px">' + esc(t("page.before_after")) + "</h2>" + beforeAfter({ avant: it.avant, apres: it.apres }) : "";
    var green = desc.join(" ").indexOf("Green Challenge") > -1 ? '<p style="margin-top:32px"><a class="link-arrow" href="durabilite.html">' + esc(t("detail.green")) + "</a></p>" : "";
    var contact = b && b.contact ? member(b.contact) : null;

    main.innerHTML =
      '<div class="wrap"><div class="detail-head"><div><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">DRP Group</a> / <a href="' + (isP ? "projets.html" : "biens.html") + '">' + esc(t(isP ? "nav.projects" : "nav.properties")) + "</a></nav>" +
      '<span class="eyebrow">' + esc(place(it)) + '</span><h1>' + esc(it.titre) + "</h1>" +
      (parent ? '<p class="muted" style="margin:12px 0 0">' + esc(t("detail.part_of")) + ' <a href="' + url(parent) + '">' + esc(parent.titre) + "</a></p>" : "") + "</div>" +
      '<div><div class="price-big">' + esc(priceText(it)) + "</div></div></div>" +
      mediaHtml +
      '<div class="detail-grid"><div>' +
      '<h2 class="h-small" style="margin-bottom:20px">' + esc(t("detail.description")) + '</h2><div class="prose">' + prose(desc) + "</div>" + green +
      unitsHtml + ba +
      '<h2 class="h-small" style="margin:48px 0 16px">' + esc(t("detail.location_title")) + "</h2>" +
      '<div class="mini-map" id="mini-map" role="img" aria-label="' + esc(place(it) + " – " + t("common.approx")) + '"></div><p class="map-note">' + esc(t("common.approx")) + "</p>" +
      "</div>" +
      '<aside class="aside-sticky"><ul class="keyfacts">' + facts.join("") + "</ul>" +
      '<div class="btn-row" style="flex-direction:column">' +
      '<a class="btn" href="contact.html?sujet=visite&amp;ref=' + encodeURIComponent(it.id) + '">' + esc(t("detail.visit")) + "</a>" +
      '<button type="button" class="btn btn--ghost fav-toggle" data-fav="' + esc(it.id) + '" aria-pressed="' + favHas(it.id) + '">' + ICON.heart + "<span>" + esc(t(favHas(it.id) ? "fav.saved" : "fav.save")) + "</span></button>" +
      (it.brochure ? '<a class="btn btn--ghost" href="' + esc(it.brochure) + '" download>' + esc(t("detail.brochure")) + "</a>" : "") + "</div>" +
      shareBox(shareUrl(), t("share.msg", { t: plain(it.titre) }), plain(it.titre) + " – DRP Group") +
      (contact ? '<div class="contact-card" style="grid-template-columns:80px 1fr;gap:16px">' + img(contact.photo, contact.nom, "r-2x3") +
        "<div><h3 style=\"font-size:1rem\">" + esc(contact.nom) + "</h3><p>" + esc(contact.role) + "</p></div></div>" : "") +
      "</aside></div></div>";

    initGallery(main, imgs, it.titre, videoHtml);
    initBeforeAfter(main);
    var miniEl = $("#mini-map", main);
    loadLeaflet().then(function (L) {
      var el = miniEl; if (!el || !document.body.contains(el)) return;
      var map = baseMap(L, el, { zoomControl: true, dragging: true });
      map.setView([it.lat, it.lng], 12);
      // ungefähre Lage: Kreis um die Ortsmitte statt Nadel auf einem Gebäude
      L.circle([it.lat, it.lng], { radius: 900, color: "#38455c", weight: 1, fillColor: "#38455c", fillOpacity: 0.12 }).addTo(map);
    });
  }
  function prose(lines) {
    var out = "", inList = false;
    lines.forEach(function (l) {
      var li = /^[–-]\s+/.test(l);
      if (li && !inList) { out += "<ul>"; inList = true; }
      if (!li && inList) { out += "</ul>"; inList = false; }
      out += li ? "<li>" + esc(l.replace(/^[–-]\s+/, "")) + "</li>" : "<p>" + esc(l) + "</p>";
    });
    return out + (inList ? "</ul>" : "");
  }
  function initGallery(root, imgs, title, videoHtml) {
    var g = $(".gallery", root);
    if (!g || imgs.length < 2) return;
    var i = 0;
    function show(n) {
      i = (n + imgs.length) % imgs.length;
      $("#g-main").innerHTML = i === 0 && videoHtml ? videoHtml : imgs[i] ? '<img src="' + esc(imgs[i]) + '" alt="' + esc(title + " – " + t("detail.photo_n", { n: i + 1 })) + '">' : ph();
      $(".gallery__count", g).textContent = (i + 1) + " / " + imgs.length;
      $$(".thumbs button", g).forEach(function (b) { b.toggleAttribute("aria-current", +b.dataset.i === i); if (+b.dataset.i === i) b.setAttribute("aria-current", "true"); });
    }
    $$("[data-g]", g).forEach(function (b) { b.addEventListener("click", function () { show(i + +b.dataset.g); }); });
    $$(".thumbs button", g).forEach(function (b) { b.addEventListener("click", function () { show(+b.dataset.i); }); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
    });
  }
  pages.bien = function (main) { detailPage(main, "bien"); };
  pages.projet = function (main) { detailPage(main, "projet"); };

  /* Hand legt einen Samen in die Erde, daraus wächst ein Spross – Linien wie die Icons der Unternehmen */
  /* Hand legt einen Samen in die Erde, zieht sich zurück; Wurzeln treiben aus, ein Spross bricht durch, daraus wächst ein großer Baum.
     Hand, Spross und Baum: Linienzeichnungen (Vorlage Higgsfield, vektorisiert). Boden und Wurzeln: eigene Linien.
     Alle Ebenen teilen dieselbe Fläche (viewBox 896 × 1120); Pflanzloch bei x 465 / y 940. */
  var SEED_SVG = {
    hand: "M 844 137.5 C 781.7 158 785 156.8 785 158.4 C 785 159.2 780.7 160.9 773.8 162.9 C 748.8 170 748.9 170 747.8 173 C 746.8 175.9 738.5 178 712 182.1 C 691.6 185.2 660.6 180.8 573.2 162.4 C 545.8 156.7 544.6 157 526.2 175.6 C 518.9 183 507.4 193.4 500.7 198.7 C 480 215.2 456.6 235.1 454.2 238.4 C 451.6 242 450.4 246 449.6 255 C 449.2 258.6 447.5 271.9 445.9 284.5 C 442.5 309.4 442.5 311.3 445.4 342.5 C 446.2 351.3 447.3 359.7 447.9 361.2 C 449.5 365.4 455.9 366.9 462.3 364.4 C 463.4 364 463.3 365 461.7 369.7 C 457.6 381.7 459.8 395.6 466.9 402.4 L 469.7 405.1 472.7 401.6 C 477.4 396.3 479.3 389.3 478.8 379.6 C 478.5 375.2 477.9 370.7 477.5 369.7 C 476.9 368.2 477.1 368.1 479.5 369 C 486.8 371.8 494.5 369.5 516.8 358 C 525.3 353.6 532.9 350 533.7 350 C 534.4 350 539.9 354.7 546 360.5 C 556.1 370.1 557.3 371 560.9 371 C 568.1 371 573.9 362.7 572.7 354.1 L 572.2 350.2 578.3 354.1 C 581.7 356.3 585.5 358.3 586.8 358.7 C 595.1 360.8 601.2 350.4 597.7 340.2 C 596.1 335.6 596.3 335.4 600 337.5 C 611.4 344 618.1 329.4 609 317.9 L 606.1 314.2 610.3 312.7 C 612.6 311.8 622.4 310.2 632 309 C 667.6 304.7 678.1 300.5 707.1 279.6 C 716.1 273.2 763.2 258.7 770.6 260.2 C 771.8 260.4 773.9 265.1 777.9 277 C 784.6 296.6 782.7 295.6 802.1 290.9 C 821.6 286.2 820.5 286.3 822 289.9 C 823.7 294 822.1 294.2 861.5 284.6 C 888 278.1 895.6 275.9 895.8 274.6 C 896 273.6 895.6 273.2 894.8 273.5 C 891.9 274.5 828.4 290 827 290 C 825.8 290 825.1 288.1 824.2 282.8 C 818.9 252.1 803.8 197.1 793 169.7 C 790.7 163.7 789 158.7 789.1 158.6 C 789.8 158 893.8 124 894.9 124 C 895.5 124 896 123.3 896 122.5 C 896 120.2 897 119.9 844 137.5M 543.3 163.9 C 540.6 165.1 534.7 170.4 527.3 178.1 C 520.8 184.8 509.9 194.8 503 200.3 C 453.4 240.3 453.6 240 452 256.4 C 451.5 261.4 449.8 276 448.1 288.9 C 444.7 314.4 445 327.9 449 336 C 451.2 340.4 453.3 352.6 452.8 358.2 L 452.5 362.5 456.9 362.4 C 467.3 362.2 474 347.3 474.8 322.9 L 475.2 309.3 470.6 308 C 464.4 306.3 464.8 304.9 471.2 305.2 C 476.4 305.5 476.5 305.4 478.3 301.8 C 480.5 297.3 485.5 277.5 486.3 270.2 L 486.9 264.9 482.5 262.2 C 475.6 258.1 476.9 256.3 483.9 260.2 L 489.8 263.5 494.7 261.1 C 501.9 257.6 511.2 250.7 516.4 244.9 C 521.1 239.7 521.1 239.5 520.5 234.6 C 519.7 229 520.7 229.1 523.9 235 C 525.9 238.8 531.1 242 535.5 242.1 C 537.1 242.1 539.4 242.5 540.5 243 C 542.4 243.8 542.4 243.8 540.1 244.7 C 537.8 245.6 538 245.9 544.1 248.7 C 553 252.9 562.5 256.3 564.3 255.8 C 565.5 255.6 564.6 252.8 559.8 243 C 552.3 227.5 550.6 223 551.9 221.7 C 552.6 221 553.2 221.3 553.6 222.6 C 553.9 223.6 557.4 231.2 561.2 239.4 C 565 247.6 568.9 256.2 569.8 258.4 L 571.4 262.4 572.8 259 C 573.5 257.2 574.4 252.6 574.7 248.8 C 575 245.1 575.7 242 576.3 242 C 577.2 242 576.9 249.4 575.6 260.7 C 575.2 264.1 570.4 270.3 562.6 277.8 C 553.3 286.6 546.9 290.8 527 300.8 C 497.4 315.7 476.3 334.9 472.9 350 C 471.1 358 475.2 365.1 482.5 366.8 C 488 368 492.2 366.4 502.2 359.4 C 510.3 353.7 514.3 352.8 508 358.1 C 506.1 359.7 504.9 361 505.2 361 C 507 361 543.7 340.9 553.2 334.8 C 567.3 325.8 581.2 319.2 598.5 313.6 C 606.2 311.1 615.1 307.4 618.3 305.4 C 624.7 301.4 626.8 301.5 622.4 305.5 L 619.5 308.1 623 307.5 C 624.9 307.3 631.9 306.3 638.5 305.4 C 666.1 301.6 682.9 294.8 703 279.1 C 713.7 270.7 717 268.5 715.5 271 C 714.6 272.4 714.7 272.4 725.6 268.4 C 736.8 264.4 755.2 259.7 767 257.9 C 771.4 257.2 775 256.2 775 255.7 C 775 250 753.8 181.7 751.1 178.7 C 750.7 178.3 741.6 179.6 730.9 181.7 C 695 188.5 684.8 187.7 601.5 170.8 C 557.2 161.8 549.8 160.9 543.3 163.9M 772.5 166 C 765.4 168.1 757.6 170.3 755.3 170.9 L 751.1 172 753.6 177.6 C 761.1 194.7 774 238.6 782.5 276.3 C 784.4 284.5 786.1 291.4 786.3 291.6 C 786.6 292 821.1 284.1 821.8 283.5 C 822.1 283.2 814.8 251.1 810.5 234.4 C 801.9 200.8 788.8 161.8 786.2 162.1 C 785.8 162.1 779.6 163.8 772.5 166M 520.3 244.4 C 518.6 246.8 513.6 251.6 509.1 255 C 493.2 267.3 489 279.9 497 291.5 C 498.6 293.8 501.3 298.4 503 301.8 C 504.7 305.2 506.5 308 507 308 C 507.4 308 510.7 306.4 514.2 304.4 C 517.6 302.4 523.8 299.3 527.8 297.4 L 535.1 294.1 532.6 289.2 C 529.5 283.1 528.6 282.3 522.8 281.5 C 519.6 281 518 280.3 518 279.3 C 518 278.4 518.7 278 519.8 278.3 C 524.6 279.7 529.2 280 530.9 279.1 C 535.1 276.8 543.1 260.1 543 253.8 C 542.9 251.3 539.7 248.7 531.2 244.4 C 528.3 242.9 525.7 241.4 525.4 240.9 C 524.4 239.3 523.4 240 520.3 244.4M 544.6 259 C 542.6 266.5 538.1 275.5 534.7 279.2 L 532.1 282 534.3 287 C 536.9 293 536.7 292.9 544.7 288.3 C 551.7 284.2 552.4 283 548 283 C 546.4 283 545 282.6 545 282 C 545 281.4 546.9 281 549.3 281 C 556.5 281 559.5 277.4 562.4 265.3 L 563.8 259.3 556.6 256.8 C 552.7 255.4 548.8 254 547.9 253.6 C 546.7 253.1 546 254.2 544.6 259M 564.7 267 C 563.1 273.6 563.9 273.8 568.1 267.9 C 569.8 265.5 569.9 264.8 568.8 263 C 566.9 260 566.4 260.5 564.7 267M 491.8 265.6 C 490.1 266.5 489 267.9 489 269.1 C 489 276 482.4 301.1 479.2 306 C 478 307.9 477.6 311.4 477.6 321.6 L 477.5 334.8 482.7 329.1 C 485.5 325.9 491.1 320.7 495.2 317.5 C 499.2 314.2 502.9 311.3 503.3 310.9 C 504.3 310.1 499.3 300 494.2 292.2 C 489.3 284.8 488.9 276 493.2 269.3 C 497.1 263.4 496.8 262.8 491.8 265.6M 591.8 318.6 C 587.5 320 584 321.4 584 321.9 C 584 323.4 589.6 326.7 593.5 327.4 C 596.1 327.9 598.7 329.5 601.3 332.1 C 605.7 336.5 607 336.8 609.3 334.2 C 612.4 330.8 611 323.7 606.2 318.8 C 603.1 315.4 601.7 315.4 591.8 318.6M 571.8 327 C 567.6 329.2 563.9 331.4 563.6 331.9 C 562.4 333.8 570.3 344 573 344 C 577 344 583.3 348.2 585.5 352.3 C 587.9 356.8 590.9 357.2 593.9 353.4 C 598.6 347.5 595 336.1 586 327.6 C 580.2 322.1 581.3 322.2 571.8 327M 593 330.9 C 593 331.9 600.3 335 601 334.3 C 601.3 334 600.4 333 599.1 331.9 C 596.7 329.9 593 329.3 593 330.9M 550.4 339.8 C 545.4 342.9 540.3 346.1 539 346.8 C 536.9 348.1 536.9 348.2 538.6 350.1 C 539.5 351.1 541.3 352 542.5 352 C 547.3 352 555.9 359.1 558.5 365.3 C 560.4 369.9 562.2 370 566.6 365.6 C 570.4 361.8 571.1 356.5 568.9 348.5 C 567.8 344.5 561.4 334 560.2 334 C 559.8 334.1 555.4 336.6 550.4 339.8M 448.1 343.5 C 447.9 348.5 449.2 357 450.1 357 C 451.3 357 451 351.4 449.5 345.5 C 448.5 341.4 448.2 341 448.1 343.5M 572 346.4 C 572 347.2 583 354.3 583.6 353.8 C 584.9 352.5 581.8 349.1 578 347.6 C 574.1 346 572 345.6 572 346.4M 549.5 359.9 C 552.8 363.3 555.8 366 556.2 366 C 557.9 366 553.9 360 550.8 357.7 C 544.3 352.9 543.6 354 549.5 359.9M 466.2 365.7 C 461.3 376.7 460.9 387.1 465.2 395.3 L 467.4 399.5 468.1 394.5 C 468.5 391.8 468.9 383.2 468.9 375.6 C 469 356 470.3 359.6 471 381.3 L 471.6 399.5 473.7 395 C 477.9 386.1 477.4 375.4 472.2 365.1 C 469.8 360.2 468.7 360.3 466.2 365.7",
    sprout: "M 424.5 757.6 C 409.2 760.6 409 760.7 409 765.5 C 409 778.5 418.7 799.7 429.8 810.8 C 441.9 822.8 451.8 827.9 472.4 832.5 C 492.4 836.9 499.7 840.6 506.7 849.8 C 515.8 861.7 517.1 884.9 510.8 919 C 505.8 945.5 505 953.2 504.3 976.5 C 503.5 1005.6 504.6 1024 507.2 1024 C 509.1 1024 509.1 1023.5 508.5 1002.2 C 507.4 969.7 509 952.1 517 908 C 518.4 900.2 519.2 891 519.4 879.5 C 520 848.1 526.7 839.8 558.3 831.4 C 579.9 825.7 593.1 817.1 602.9 802.4 C 609.4 792.8 613.9 779 614.3 768.2 C 614.6 758.3 613.5 757.6 597.5 757.6 C 553.2 757.7 522.3 793.7 517.4 851 L 516.7 859.5 514.5 854.5 C 513.3 851.8 511.7 846.1 511 842 C 503.3 795.7 480.4 765.1 448.8 758.6 C 441.8 757.1 429.4 756.7 424.5 757.6 M 423.5 762 C 411.7 763.8 411.5 764.2 417.3 782 C 425.9 808.5 442.7 821.5 479.3 829.9 C 489.5 832.2 497.5 835.7 503.2 840.1 L 507.1 843.3 506.4 839.4 C 504.4 827.9 498.5 811 492.6 799.3 C 478.7 771.6 452.7 757.6 423.5 762 M 580.7 763.6 C 567.7 766.7 553.7 775.8 544.4 787.1 C 535 798.6 525 823.5 522.6 841.3 L 522 846.2 527.5 841.2 C 534.3 835 540.3 832.1 554.8 828.1 C 586.2 819.4 601.3 806 607.9 780.8 C 611.2 768.2 611.5 763.4 608.8 762.6 C 604.7 761.5 586.6 762.1 580.7 763.6",
    tree: "M 446.7 47.5 C 438.3 49.8 430.7 54.3 423.9 61 L 417.2 67.5 411.4 66.2 C 396.2 62.8 378.4 70.6 369.4 84.6 C 365.7 90.4 362 100.5 362 104.8 L 362 107.6 353.8 107.2 C 332.4 106.1 314 122.9 314 143.6 L 314 147.8 310.1 146.4 C 306.2 145.1 301.3 145.7 298.6 147.9 C 297.9 148.5 295.8 148.4 292.7 147.7 C 289.3 147 286 147 280.8 147.8 C 261 150.8 245.8 166.2 242.7 186.5 C 241.5 193.7 241.3 194.3 238.4 195.5 C 235 196.9 232 200.5 232 203.1 C 232 204.3 230.7 204.9 227 205.3 C 216.1 206.6 204.5 215.5 198.4 227.1 C 194.5 234.5 194.1 251.8 197.7 258.9 C 199.7 262.8 199.8 263.5 198.5 265.3 C 196.6 268.1 196.6 275.7 198.5 279.4 C 199.3 280.9 200 282.3 200 282.4 C 200 282.4 197.5 282.3 194.4 282.2 C 185.2 281.6 175.3 286.7 171.4 294.1 C 170.1 296.8 169.5 297 164.5 297 C 144.8 297 126 319.7 130.9 337.6 C 131.9 341.2 131.8 341.7 129.1 344.5 C 120.1 354 119.6 369.4 127.9 380.5 L 130.8 384.4 127.5 386.5 C 125.4 388 122.3 388.9 118.4 389.2 C 93.4 391 74.4 419.8 83.4 442.2 L 86.1 448.8 81.1 453.9 C 64.1 471.3 63.9 499.5 80.5 516.9 C 84.2 520.8 86 523.5 86 525.2 C 86 531.1 96 540.1 104 541.5 L 108 542.2 105.8 546.3 C 102.4 552.8 102.6 563.7 106.3 571.2 C 111.3 581.4 124.2 590 134.5 590 C 135.8 590 138.4 591.7 140.8 594 C 143 596.2 145.7 598 147 598 C 149 598 148.9 598.3 145.7 602 C 138.7 610.2 138.2 623 144.6 630.1 C 146 631.6 146 632.7 145 637.6 C 140.1 661.1 164.2 684.2 185.7 676.7 L 189.9 675.3 193.5 679 C 205.3 691.1 226.1 691.8 238.1 680.4 C 239.9 678.7 241.8 678 244.6 678 C 249.8 677.9 256.3 674.9 259.1 671.1 C 262.4 666.6 263.2 667.3 260.8 672.6 C 258.3 678.3 258.7 686 261.5 690.4 C 263.1 692.8 263.5 695.2 263.5 704.4 C 263.5 714.7 263.7 715.9 266.5 721.3 C 272.3 732.9 284.7 741 297.1 741.4 C 302.3 741.6 302.9 741.9 306.5 745.9 C 318.5 759.1 340 759.1 351.3 745.9 C 354.8 741.9 355.2 741.7 361.2 741.5 C 373.6 741.1 384.8 733.1 388.7 721.9 C 389.7 719.1 391.1 717 391.9 717 C 397.2 717 406 707.4 406 701.6 C 406 700.7 407.6 698.4 409.5 696.6 C 412.8 693.5 413 692.9 413.1 686.9 L 413.1 680.5 417.1 688.3 C 428.9 711.3 435.5 743.8 436.7 784 C 438 827.8 427.4 1014.4 420.4 1070.5 C 417.1 1097.7 414 1109.3 408.4 1115.9 L 404.8 1120 407.9 1120 C 422.9 1120 428.9 1070.9 439.4 864.5 C 444.1 772.8 441.2 735 426.4 697.6 C 418.7 678.1 402 651.7 394.5 647 C 392.6 645.9 391.3 644.3 391.6 643.6 C 392.7 640.7 366.1 616.7 349.5 605.7 C 339.9 599.3 340.1 598.4 349.7 604.6 C 352.8 606.6 356 608.3 356.7 608.4 C 357.4 608.5 359.2 609.8 360.7 611.2 C 362.3 612.6 368.2 617.2 374 621.5 C 401.3 641.9 424.7 671.4 440.1 704.7 C 448.5 722.8 450.4 720.1 454.4 684.5 C 463.2 604.1 453.7 516.6 431.8 478.2 C 430.2 475.4 429.1 473 429.3 473 C 429.6 473 430.8 474.6 432 476.6 C 436.2 483.9 436.3 479 432 464 C 425.9 442.2 427.2 444.9 437 474 C 441.9 488.6 446.3 501.1 446.7 501.8 C 448.4 504.6 449.5 503.3 450.1 498 C 450.5 493.9 450.7 495.5 450.8 504 C 451 514 451.6 518 455.6 534 C 465.5 574.1 469.2 606.9 469.4 655.5 C 469.5 688 469.7 688.1 480.7 668.7 C 490.3 651.6 515.7 616.1 520.2 613.4 C 521.2 612.8 521.2 612.9 520.4 614.1 C 515.3 620.5 508 631.5 508 632.7 C 508 634 508.4 634 510.8 632.5 C 512.3 631.5 510.8 633.5 507.5 636.8 C 487.5 657.4 471 701.5 465.6 748.5 C 462.2 778.1 459.5 850.1 459.5 912.5 C 459.5 967.5 459.9 977.8 464.1 1018 C 471.2 1087.1 478.9 1120 488 1120 L 491 1120 487.5 1115.4 C 483.5 1110.2 481.9 1105.2 479 1089.5 C 465.8 1018.1 461 935.4 465 848.6 C 467.2 801.2 475.9 776.8 499.4 752.2 C 510.2 740.9 510.2 741 515.5 745.9 C 520.6 750.6 523.3 751.5 530.5 750.7 C 535.1 750.2 536 750.4 536.5 751.9 C 537.6 755.4 546.2 763 552.6 766.1 C 573.9 776.6 601.9 764.3 608.5 741.6 L 610 736.4 616.4 736.8 C 635.4 738 655 720.6 655 702.4 L 655 699.3 659.8 701.7 C 663.5 703.6 665.4 704 669 703.5 C 676.3 702.6 677.2 702.7 683.5 705.1 C 691.7 708.2 704.1 708.2 712.2 705.1 C 724.7 700.3 736.4 688.2 739.1 677.4 C 740 673.8 740.7 673.1 744 672.1 C 746.2 671.5 749.1 669.5 750.7 667.6 C 752.5 665.4 755.4 663.7 758.8 662.5 C 765.6 660.3 774.6 652.1 778.3 644.8 C 785.3 630.9 783.5 614.5 773.8 603.5 C 769.9 599.1 769.7 598.4 769.9 593.5 C 770.2 586.8 767.7 581.6 761.7 576.4 L 757.3 572.6 761.2 569.8 C 765.3 566.8 769 561.6 769 558.9 C 769 557.6 770.4 557.2 775.4 556.8 C 790.1 555.6 802 543.8 802.6 529.7 C 802.9 523.9 802.9 523.9 808.2 520.2 C 827.3 506.8 833.5 479.7 822.4 457.9 C 816.8 446.7 803.2 436.1 792.7 434.5 L 788.5 433.8 788.4 428.1 C 788.2 413.8 775.2 401 760.8 401 C 756.1 401 755 400.7 754.5 399.1 C 752.7 393.5 743.3 388 735.4 388 C 732.7 388 732.7 388 734.6 385.9 C 735.8 384.5 736.5 382.1 736.6 378.9 C 736.8 375.2 737.5 373 739.9 369.8 C 744 364.2 745.3 359 744.8 350.5 C 744.2 342.4 742.4 338.2 736.6 332.2 L 732.5 327.9 735.8 325.4 C 741 321.3 744 315.2 744 308.6 C 744 304.6 744.7 301.7 746.2 298.7 C 749.5 292.7 749.4 275.8 746.2 268.6 C 741.4 258 734 250.6 724.7 246.9 C 720.9 245.4 720.5 244.9 719.5 239.9 C 714.9 216.7 689.6 201.2 666.6 207.4 C 661.5 208.8 659.5 208.9 656.2 208 C 652 206.9 643.6 208.2 642.4 210.1 C 641.2 212 640.3 210.7 638.5 204.8 C 634.1 190 618.8 181.4 602.6 184.4 C 599.2 185.1 598.8 184.9 599.4 183.4 C 601.4 178.2 601.2 173.1 598.9 168.3 C 596.9 164.2 596.6 162.3 596.8 155.5 C 597.8 132.5 577.9 113.1 556.9 116.6 L 551 117.6 548 113.4 C 542.5 105.6 531 101.9 520 104.2 L 516.5 105 516.8 99.7 C 517.1 95.1 516.8 93.9 514.5 91.2 C 513.1 89.5 511.2 85.5 510.4 82.3 C 506.3 66.4 489.9 51 473 47.1 C 466.8 45.7 452.5 45.9 446.7 47.5 M 454 51 C 445.9 52.3 437.7 55.6 432.2 59.9 C 426.9 64.2 421 70.5 421 72.1 C 421 73.3 418.8 73 411 71 C 390.8 65.7 369 83.1 367.1 105.9 C 366.4 114.5 366.6 114.4 356.6 112 C 344.5 109 328.5 117.2 322.5 129.5 C 319.4 135.8 318.2 145.3 319.9 150.1 C 321.3 154.3 319.2 157.3 316.2 155.2 C 308.1 149.3 304.2 148.6 300.4 152 C 298.5 153.9 297.8 154 293.6 152.9 C 277.9 149 259.3 158.5 251.3 174.7 C 247.8 181.9 247.4 184 247 198.2 C 247 198.7 245.5 199 243.7 199 C 239.6 199 236.3 202.2 235.8 206.5 C 235.5 209.4 235.3 209.5 228.9 210.2 C 206.3 212.4 192.5 238.5 203.1 259.2 C 205 262.9 205 263 202.9 266.9 C 200.2 272.1 201.1 276.7 206.1 283 C 211.4 289.8 209.8 291.2 200.1 288 C 189.4 284.6 179.5 288.3 175 297.4 L 172.8 302 166.2 302 C 146.6 302.2 132.1 318.8 135.8 336.9 L 137 342.7 133.2 346.7 C 123.7 356.6 124.7 370.9 135.7 381.7 C 144.1 389.9 144 392 135.5 389.9 C 131.1 388.8 130.8 388.9 128.1 391.4 C 125.9 393.5 124.7 394 122.7 393.5 C 116.5 391.9 101.8 398.9 95.1 406.5 C 86 416.9 83.6 432.6 89.4 444.3 L 92.2 450.1 86.2 455.8 C 69.1 472.1 68.5 498.8 85 514.7 C 88.8 518.4 90 520.2 90 522.5 C 90 529.8 99.5 536.9 109.3 537 C 115.5 537 116.1 538.6 112.1 544.6 C 101 561.4 113.2 582.9 135 584.9 C 140.7 585.4 141.5 585.8 141.8 587.7 C 142.3 591.1 146.8 593.4 152.7 593.3 C 158.8 593.1 160.7 595.3 156.8 598.2 C 150.2 603.1 149 604.3 147.1 608.3 C 143.6 615.5 144.6 622.8 149.7 628.2 C 152.1 630.7 152.2 631.1 150.9 634.2 C 150.1 636 149.5 640.7 149.5 644.6 C 149.5 664.9 170.3 678.8 188.8 670.9 C 191.8 669.6 192.1 669.7 193.7 672 C 203.2 685.6 222 687.8 234.5 676.8 C 239 672.9 239.7 672.5 245.1 672.5 C 251.4 672.5 256.4 669.2 257.6 664.3 C 258.1 662.3 258.7 662.1 263.8 662.3 C 270 662.6 271.7 664.5 268.6 667.9 C 263.3 673.8 262.5 684.2 267 689.4 C 269.6 692.3 269.9 693.2 269 695.5 C 267.3 700 267.8 711.4 270 717.3 C 274.2 728.6 285.8 736.4 298.4 736.5 C 305.2 736.5 305.3 736.5 307.8 740.2 C 313.8 749.3 327.9 753.6 338.5 749.6 C 342.7 748 352 739.3 352 737 C 352 736.3 353.9 736.1 357.9 736.6 C 370.8 738 381.3 730.7 384.6 718 C 385.6 713.9 386 713.4 389.3 712.9 C 396.5 711.8 401.8 705.6 400.6 699.9 C 400.1 697.3 400.4 696.8 403.4 695.6 C 411 692.4 411 675.3 403.4 663.9 C 394.9 651.1 387.6 645.4 376 642.4 C 366.9 640.1 355 641.4 355 644.6 C 355 647.7 350 655.8 345.5 659.9 C 338.5 666.3 333.3 668.3 321.8 668.8 L 312 669.2 312 666.8 C 312 659.6 322 647.1 331.6 642.4 C 336.8 639.9 338.6 639.5 346.5 639.5 C 351.4 639.4 357.9 638.8 360.8 638.1 C 364.2 637.3 369.3 636.9 374.3 637.2 L 382.5 637.7 375.5 631.3 C 358.9 616.1 335.6 600.4 312.5 588.9 C 297.6 581.5 288.6 578.7 273.3 576.8 L 264 575.6 258.1 581.8 C 246.2 594.3 231.6 597 215.4 589.9 C 209.8 587.4 209.9 586.4 216.2 580.4 C 228.9 568.5 242.2 565.3 256 571 C 259.3 572.3 263.9 573 272.8 573.3 L 285.1 573.7 277.8 569 C 266.9 562 256.5 553.4 244.2 541.3 C 220 517.3 207 507.4 201 508.5 C 180.8 511.9 170.2 508.2 160.5 494.6 C 154.6 486.3 154.7 483.9 161 482.7 C 177.3 479.8 195.6 487.5 201.8 500.1 C 203.5 503.5 205.3 505 211.2 508.2 C 215.2 510.4 220.4 513.8 222.8 515.7 C 227.8 519.8 227.8 519.6 224.1 512.2 C 222.6 509.1 220.7 504.7 220 502.5 C 219.3 500.3 217.6 496.9 216.1 495 C 209 485.7 206.5 477.9 207.3 468.1 C 207.9 460.3 211.2 451 214.6 447.2 L 217 444.5 220 448 C 231.4 461.5 233.7 477.1 226.4 491.8 L 222.7 499 225.6 505.8 C 237.1 532.8 266.6 560 304.3 578 C 345.9 597.9 346.3 598 344.6 595.7 C 341.8 591.8 326 567.8 321.1 559.9 C 316.6 552.9 315.9 552.2 312.2 551.7 C 295.3 548.9 283 533.3 283 514.5 C 283 506.5 283.5 506.4 294.8 512 C 308 518.6 316.6 530.3 317.9 543.6 C 318.5 548.8 319.3 550.8 323.4 556.6 C 326 560.4 330.7 567.2 333.8 571.8 C 336.8 576.3 339.5 579.9 339.7 579.7 C 339.9 579.5 339.6 576.9 339 574 C 338.5 571.1 338 566.7 338 564.3 C 338 561.9 337.3 558.6 336.6 557.1 C 329.9 544.2 333.5 526 345.1 514.2 C 351.3 508 352.6 507.8 354.6 512.7 C 361.7 529.6 358.8 546.6 346.8 558.1 L 341.7 563 342.3 569 C 343.2 577.3 348.3 589.8 353.7 597 C 358.2 603.1 364.2 608.5 378.6 619.5 C 403.4 638.4 424.1 663.5 439.6 693.3 C 447.8 709.3 447 709.8 449.4 686.9 C 456.6 620.1 452.9 556.8 438.9 507.3 C 426.9 464.7 392.5 426.4 355.2 414 C 343.7 410.2 337.7 410.2 333.5 413.9 C 325.5 420.9 314.9 423.9 305.2 422 C 298.3 420.6 286 414.2 286 412 C 286 411.2 288.8 408.6 292.2 406.3 C 305.9 397.1 316.7 396.1 330.2 402.8 C 334.9 405.1 340.1 407 341.7 407 C 344.4 407 358.7 410.1 362.2 411.5 C 363.1 411.9 357 405.2 348.7 396.8 C 340.3 388.3 327.9 375.5 321 368.4 C 308.4 355.3 301.2 349.6 292.1 345.8 L 287.2 343.8 280.3 346.6 C 266.5 352.3 253.8 349.9 242 339.3 C 235.3 333.3 235.5 331.4 243.5 328.4 C 259.2 322.5 274.8 325.6 283.7 336.4 C 285.3 338.3 288.4 340.6 290.6 341.4 C 292.8 342.1 296.9 343.9 299.7 345.4 L 304.8 347.9 299.8 338.2 C 296.6 332.1 292.8 326.6 289.7 323.5 C 280.2 314.1 276.8 300.9 280.5 287.5 C 282.7 279.3 284 278.1 287.9 280.9 C 299.3 289.1 304.6 306.5 300.1 321.1 C 297.8 328.4 298.2 329.9 305.1 340.2 C 313.1 352.1 351.4 396 352.6 394.7 C 352.9 394.5 352.4 392.7 351.6 390.8 C 350.8 388.9 349.6 385.1 349 382.4 C 348.3 379.7 346.2 374.2 344.2 370.1 C 337.9 357.3 339.1 344.2 347.7 331.8 C 351 327 351.9 327 355.2 332.3 C 363.2 345.1 362.9 361.6 354.5 372.6 C 351 377.2 351.6 382.2 357.1 392.8 C 362.7 403.7 367 408.3 385.9 423.5 C 401.7 436.1 417.3 450.9 424 459.4 C 425.6 461.5 427 463 427 462.6 C 427 462.3 425.8 457.1 424.4 451.2 C 413.9 407.2 410.7 378 413.1 350 C 415.7 320.3 414 303.4 406.3 284.6 L 403.5 277.7 397.5 276 C 381 271.5 371.3 261.1 368 244.5 C 366.1 234.5 366.7 232.4 371.5 232.7 C 386.4 233.6 405 253.2 405 268 C 405 271.4 406.1 275 408.9 281.1 C 412.8 289.4 417.9 305.2 418.1 309.4 C 418.1 310.5 419.2 307.9 420.5 303.5 C 421.8 299.1 425.3 286.9 428.3 276.5 C 437.3 245.5 439 231.2 435.5 216.4 C 433.2 206.7 432.3 205.3 427.8 204.6 C 413.8 202.3 401.3 187.6 400.7 172.6 L 400.5 167.5 405.1 167.6 C 418.3 168.1 431.5 181.4 434.4 197.2 C 435.2 201.2 436.8 207.4 438 211 C 439.2 214.6 440.4 218.2 440.7 219 C 441.9 222.6 446.1 203.3 446.3 193 C 446.8 176.4 453.3 164.5 465.8 157.7 C 472.6 154 473.5 155.1 473.5 167.9 C 473.4 183.1 466.8 194.5 454.2 200.9 C 449.3 203.4 448.5 205.7 444.4 227 C 442.9 234.4 440.7 245.4 439.4 251.5 C 438.2 257.5 437.3 262.6 437.4 262.8 C 437.6 262.9 439 261.2 440.5 259 C 442 256.8 446.3 252.1 450 248.6 C 454.4 244.5 457.6 240.4 459.2 236.9 C 464.1 226.2 474.2 219.1 487.8 216.9 C 503 214.4 505.1 217.2 497.1 229.2 C 489.1 241 479.8 246 465.9 246 C 458.2 246 457.9 246.1 454 249.6 C 441.8 260.6 431.9 279.8 426 303.4 C 412.9 356.2 417.2 404 441.1 473.2 C 446 487.3 448 490.4 448 483.9 C 448 478.6 452.1 460.9 456.1 448.5 C 464 424.4 475.6 404.1 497.8 375.3 C 515 353 522.4 339.7 526.4 323.9 C 528.6 315 528.4 311.7 525.6 308.3 C 520 301.6 518.5 297.1 518.5 287 C 518.5 278.3 518.8 276.9 521.7 270.9 C 526.5 261.1 528.1 260 531.4 264.2 C 540.7 276.4 542.4 291.9 535.8 305.1 C 532.7 311.3 529.1 326.4 530.3 327.6 C 531.3 328.6 543.5 308.7 544.2 305.1 C 547.1 289.6 561.2 275.9 575.6 274.2 C 581.1 273.6 581.7 274.9 579.5 282.7 C 577.1 290.9 573.5 297.5 568.9 302.1 C 564.2 306.8 553.9 312 549.4 312 C 545.6 312 545.4 312.3 530.9 334.8 C 525.2 343.8 517.7 355.3 514.3 360.5 L 508.1 369.9 514.3 365.9 C 517.7 363.8 524.1 360.6 528.5 358.9 C 534 356.8 538 354.4 541.3 351.3 C 543.9 348.9 548.2 345.9 550.8 344.7 C 560.2 340.3 583.2 342.7 588.1 348.6 C 589.6 350.5 586.9 353.6 578.9 359 C 567 367.2 550.5 368.2 540.5 361.3 C 537.5 359.3 535.6 359.7 526.6 363.9 C 505.5 374 485.4 396.2 472.1 424 C 455.7 458.3 450.8 498.7 459.2 530.5 C 469.3 568.3 474 606.7 474 649.8 L 474 671.4 479.1 662.5 C 488.9 645.3 505.2 623.8 529.3 596.1 C 545.9 577 553.1 563.5 555.9 546.1 C 556.9 540 556.9 539.8 553.7 535.6 C 543.5 522.3 542.6 506.2 551.1 491.3 C 555 484.5 556.6 484.6 561.3 491.8 C 570.1 505.3 571.2 519.1 564.5 532.6 C 562.1 537.5 560.5 542.6 559.8 547.2 C 559.3 551 557.8 557.3 556.5 561.1 L 554.2 568 567.7 555.3 C 608.6 516.7 631.4 489.7 642.2 467 L 646.2 458.5 643.5 450 C 638.5 434.4 641 422.3 651.5 410.2 C 657.9 403 659.2 403.3 662.6 412.6 C 668.2 428 665.4 442.4 654.7 453.1 C 651.6 456.2 649.3 459.8 647.7 464.2 C 644.4 472.9 641.7 478 635.3 487.8 C 632.4 492.4 630.5 495.8 631.2 495.4 C 631.9 495 634.8 493 637.5 491 C 640.2 488.9 647 484.5 652.5 481.2 C 661.4 475.8 663.1 474.3 666.6 468.7 C 671 461.9 677.4 456.9 684.4 454.7 C 689.8 453.1 707.5 453.1 709.1 454.7 C 712.2 457.8 700.3 471.8 690.5 476.6 C 685.1 479.2 683.4 479.5 674 479.6 C 668.2 479.7 663 479.8 662.4 479.9 C 661.4 480 646.5 489.3 644.7 490.9 C 643.4 492.2 656.4 490.9 660.5 489.4 C 670.1 485.7 681.5 488 690.7 495.6 C 696.7 500.5 696.4 502.3 689.2 504.4 C 677.5 507.6 667.8 505.6 660.2 498.4 L 655.5 493.9 649.3 495 C 632.8 497.8 627.3 502 591.4 538.7 C 554.9 576.2 544.8 587.6 526.7 612.2 L 518.1 623.9 525.4 619.9 C 534.6 615 544.7 611.5 557.4 609 C 572.8 605.9 583 600.5 583 595.4 C 583 589.3 589.7 581 597.5 577.4 C 605 573.9 606.4 574.1 605.7 578.9 C 604.6 587.5 598 595.9 588.7 600.5 C 585.8 601.9 582.2 604 580.7 605.3 L 577.9 607.5 592.5 606.8 C 615.4 605.6 623.3 603.9 628.5 599.1 C 637.3 591 647.7 588 659.1 590.4 C 666.8 592.1 676 596.4 676 598.4 C 676 600.2 667.8 606.4 661.1 609.8 C 652.8 613.8 638 613.8 630 609.7 L 624.5 606.9 616.9 608.4 C 612.7 609.2 605.9 610.2 601.9 610.6 C 597.8 611 595.4 611.6 596.5 611.8 C 597.6 612 601.5 613.5 605.2 615.1 C 608.8 616.7 613.1 618 614.7 618 C 626.5 618 638.7 629.1 644 644.6 C 646.7 652.5 646.3 653.4 639.9 652.6 C 624 650.5 611.7 639.9 608.5 625.6 C 607.2 619.7 604.9 618.2 592.2 614.9 C 562.9 607.4 526.6 619.4 507.7 642.8 C 484 672.2 471 718.6 467.6 786 L 467 796.5 468.9 791.4 C 474.8 775.3 484.1 761.3 499.5 745.2 C 511.5 732.7 511.5 732.7 515.5 739.1 C 519.6 745.4 528 747.8 535.2 744.6 C 536.5 744 537.6 745.1 540.3 749.3 C 552 767.6 577.2 770.7 593.4 755.9 C 599.3 750.5 605 740.7 605 736 C 605 732 606.7 731.1 612.5 732 C 632.8 735.2 652.2 717.1 650.8 696 C 650.4 690 652.8 689.5 658 694.5 C 662.3 698.7 668.1 700 672.9 698 C 675.5 696.9 676.5 697.1 681.3 699.4 C 702.2 709.7 728.6 697.1 735.4 673.6 C 736.4 670 737 669.5 740.5 668.8 C 744.9 667.8 746.5 666.7 748.3 663.3 C 749.1 661.6 751.2 660.2 754.7 659.1 C 767.7 654.7 776.2 644 777.7 630 C 778.7 620.3 773.3 607.1 766.7 602.7 C 764.4 601.2 764.3 600.6 764.7 594.8 C 765.4 584.9 761.1 579 750.5 575.2 C 743.6 572.7 743.5 569.8 750.2 568.9 C 758.7 567.6 763.9 562.9 764.3 556.3 L 764.5 552.5 773 552 C 788.7 551 799 540.6 797.7 526.8 L 797.2 521.1 802.3 518.2 C 809.2 514.3 815.5 507.3 819.4 499.2 C 822.3 492.8 822.5 491.9 822.5 480.5 C 822.5 468.8 822.4 468.3 819 461.6 C 812.8 449.3 802.6 441.2 789.7 438.6 L 783.6 437.4 783.6 429.9 C 783.4 414.8 771.5 404 756.5 405.2 C 753 405.5 752.5 405.2 750.6 401.6 C 746.5 393.9 739.5 391.2 730.2 393.6 C 720.8 396.1 719.5 394 726.5 387.8 C 731.1 383.7 733.1 379.2 732.3 374.7 C 731.9 372.8 732.6 371.1 734.5 368.8 C 743.8 357.8 741.4 340 729.8 332.5 C 724.4 329.1 723.7 326.4 727.8 324.9 C 734.7 322.3 741 312.5 739.4 306.8 C 738.6 304.3 738.9 302.7 741 298.6 C 744.8 290.9 744.7 275.8 740.7 268.3 C 735.7 258.7 729.9 253.6 720.2 250.1 C 715.7 248.5 715.6 248.4 715.3 243.5 C 713.9 221.8 687.8 205.5 665.6 212.5 C 661.1 213.9 659.4 214.1 657.4 213.1 C 651.9 210.6 647 211.9 641.3 217.3 C 636.7 221.6 635.3 220.5 634.8 212.2 C 634.3 203 630.7 196.8 623.1 192.3 C 614.3 187 607.8 187 595.3 192.1 C 591.2 193.8 588.7 192.1 590.8 189.2 C 596.6 180.9 597.5 173.3 593.1 167.4 C 591.2 164.8 591.1 163.9 591.9 159.3 C 594.5 145.7 587.1 130.7 574.6 124.2 C 569.2 121.4 556.8 120.5 550.8 122.3 C 548.4 123.1 548 122.9 546.7 119.8 C 542.4 109.5 528 105.2 517 110.9 C 509.7 114.7 509 113.8 511.4 104.5 C 512.9 98.8 512.1 94.4 509.1 91.9 C 508.1 91.1 506.9 88.5 506.5 86.3 C 502.9 64.4 477.5 47.4 454 51 M 463 165.2 C 456.7 170.3 452.4 177.6 450.9 185.4 C 449.6 192.8 450.3 193.4 453.3 187.3 C 459.5 175.2 462.8 175 457.6 187.1 C 455.6 191.6 454.2 195.5 454.4 195.8 C 455.6 197 464 187.3 466.4 182 C 468.9 176.5 470.4 163 468.7 161.3 C 468.4 161.1 465.9 162.8 463 165.2 M 405.5 175.8 C 407.2 185.2 413.7 194.2 421.6 198.1 C 427.7 201 427.7 200.4 422 193.3 C 419.2 189.9 417 186.6 417 186.1 C 417 183.5 420.2 185.4 424.9 190.8 C 429.5 195.9 429.9 196.2 429.1 193.4 C 426.8 185.2 420.7 178.2 412.6 174.4 C 405.4 171.1 404.6 171.2 405.5 175.8 M 480.7 223.4 C 474.1 225.6 467.4 230.7 464.9 235.3 C 464.1 236.8 464.6 236.6 467.7 234.6 C 473 231.1 478.8 228.8 479.5 229.9 C 479.8 230.4 476.6 233.2 472.5 236.1 C 468.4 238.9 465 241.5 465 241.8 C 465 242.9 475.2 241 479.8 239 C 485.1 236.7 491.4 230.7 494.8 224.8 L 496.9 221 492.2 221 C 489.6 221 484.4 222.1 480.7 223.4 M 371.6 240.2 C 374.3 255 379.8 263.8 389.5 268.5 C 396.8 272.1 398 271.4 393.6 266 C 385.4 255.8 386.4 252.9 395 261.5 C 400.8 267.3 401 267.3 400 264.1 C 396.3 251.3 386.3 241.3 373.3 237.5 C 371.2 236.9 371.1 237.1 371.6 240.2 M 525.3 273.6 C 521.3 282.4 521.1 290.4 524.6 297.6 L 527.5 303.5 527.8 294.2 C 528.2 281.1 530.2 281.6 531.6 295.1 L 532.3 302.5 533.8 299 C 536.6 292.7 535.9 282.5 532.3 274.8 C 530.5 271 528.8 268 528.5 268 C 528.2 268 526.7 270.5 525.3 273.6 M 566.2 282.1 C 559.8 285.3 554.2 290.8 550.9 297.2 C 547.7 303.4 548.7 303.7 554.2 298.4 C 561.5 291.4 563 290.4 563 292.1 C 563 292.9 560.2 296.6 556.9 300.3 C 553.5 304 550.9 307.3 551.2 307.5 C 552.1 308.5 560.9 303.5 564.8 299.7 C 569.1 295.6 574.1 287.1 575.4 281.8 C 576.3 278 574.1 278.1 566.2 282.1 M 284 291.7 C 282.6 298.4 283.2 304.3 286.1 311 C 288.4 316.3 292.9 321.5 291.6 317.3 C 290.5 313.7 289 303.7 289.5 303.1 C 290.5 302.2 291.8 304.6 294 311.5 C 296.3 318.3 296.4 318.4 297.2 315.5 C 299.3 308.3 295.4 295.2 289.2 288.8 C 285.7 285 285.3 285.2 284 291.7 M 247.5 331.6 L 242.5 333.2 247.2 337.5 C 254.7 344.3 265.3 346.7 275.4 343.9 C 280.3 342.5 279.3 341.7 270.2 339.5 C 259.7 337 260.3 334.3 271 336.1 C 278.9 337.3 279.3 336.9 273.4 333.4 C 267.5 329.9 255.5 329.1 247.5 331.6 M 347.5 341.2 C 344.2 348.4 343.7 357.9 346.2 364 L 347.7 367.5 348.3 360.5 C 349.4 346.8 351.7 347.4 351.9 361.5 L 352.1 368.5 354.2 364.5 C 357.5 358.3 357.7 349.8 354.8 342.1 C 351.6 333.7 350.9 333.7 347.5 341.2 M 559.5 346.6 C 556.1 347.5 551.6 349.3 548.5 351.2 C 545.5 353 545.6 353 555.5 352.4 C 568 351.6 567.3 352.9 553.5 356 L 543.5 358.3 547.5 359.8 C 554.7 362.4 563.6 361.9 571 358.3 C 579.4 354.2 583 351.2 580.9 349.9 C 577.1 347.5 564.1 345.5 559.5 346.6 M 302.9 405.4 C 299.7 406.6 296 408.7 294.5 409.8 L 291.7 412 297.5 414.6 C 308.1 419.5 320.9 418.7 328.3 412.7 L 331.1 410.5 321.5 410.8 C 316.3 411 311.2 410.9 310.3 410.6 C 307.5 409.5 310.2 408.1 316.5 407.5 C 327.1 406.4 328.1 406 324 404.5 C 318.3 402.3 309.3 402.7 302.9 405.4 M 653.7 414.4 C 646.8 423.4 644.1 433.2 646 442.4 C 647.4 449.4 648 449 650.5 438.9 C 653.6 426.6 655.3 429.9 653.4 444.5 L 652.9 448.5 654.9 446.2 C 660.5 439.8 662.3 427.4 659.4 416.8 C 657.5 410 657.1 409.9 653.7 414.4 M 214 457.7 C 210.8 466.1 211 476.1 214.3 483.4 C 215.7 486.5 217 489 217.2 489 C 217.4 489 217.4 485 217.2 480 C 217 474.2 217.2 471 217.9 471 C 219.1 471 219.5 472.6 221 482.5 C 222.4 491.2 222.4 491.2 224.5 485 C 227.2 476.9 226.3 467.8 222 459.4 C 217.5 450.8 216.7 450.6 214 457.7 M 690.9 458 C 683.9 459.2 678 462.3 673.5 467 L 669.5 471.2 675.4 468.6 C 682.2 465.6 687.9 465 684.5 467.6 C 683.4 468.5 679.9 470.5 676.8 472.1 C 673.6 473.7 671 475.3 671 475.7 C 671 477.1 683.9 474.8 688.5 472.5 C 693.1 470.3 705 459.6 703.9 458.6 C 702.9 457.6 695.1 457.3 690.9 458 M 164.2 486.7 C 160.3 487.2 160.8 488.7 167.3 495.7 C 173.9 502.9 183.1 506.5 191.9 505.3 L 196.3 504.7 188.7 500.8 C 177.5 495.2 178.9 492.4 190.4 497.5 C 195.7 499.8 196 499.9 195 498 C 191.2 490.8 175.6 485.1 164.2 486.7 M 552.9 497.7 C 549.5 506.2 549.5 519.6 553 526.3 C 556.4 533.1 556.5 532.9 556.1 522.9 C 555.6 508.7 558.2 506.5 559.6 520 C 560.5 529 561.5 530.5 563 525 C 565 517.6 563.9 506.4 560.5 499.7 C 556.2 491.1 555.6 490.9 552.9 497.7 M 671.8 493.7 C 678.1 495.9 677.1 497.4 669.8 496.6 L 663.5 495.9 666 497.9 C 670.6 501.6 678.6 502.8 685.4 500.9 L 689.4 499.8 686.9 497.8 C 682.8 494.6 676.1 492 671.7 492.1 L 667.5 492.2 671.8 493.7 M 287.5 518.2 C 289.5 531 294.8 539.2 304.1 543.9 C 307.5 545.6 310.5 546.8 310.7 546.6 C 310.9 546.4 308.6 542.9 305.5 538.9 C 302.5 534.8 300 531.2 300 530.8 C 300 528.9 302.4 530.5 308 536.2 L 314.1 542.5 312.1 537.1 C 308.5 527.4 300 518.2 291.7 515.1 C 287.2 513.3 286.8 513.6 287.5 518.2 M 346.7 518.9 C 339.5 526.9 336.4 538 338.5 548.7 L 339.2 552.5 341.5 544.6 C 345.6 530.8 347.8 533.9 344.6 549 L 343.2 555.5 346.9 551.3 C 353.5 543.9 355.6 532.6 352.6 521.1 C 350.7 514.2 350.9 514.3 346.7 518.9 M 235 573.9 C 230.7 575.2 224.7 578.8 220.5 582.3 L 216.5 585.8 221.9 587.4 C 233.3 590.8 244.1 588.7 252.5 581.6 C 256.1 578.5 255.5 578.4 243.5 580.4 C 230.2 582.7 231.3 580.2 245.3 576.3 C 249.8 575 250.8 574.4 249.4 573.9 C 246.9 572.9 238.2 573 235 573.9 M 596.8 582.1 C 593.5 583.8 588 589.6 588 591.4 C 588 591.7 589.1 591.3 590.5 590.4 C 593.5 588.4 594 590.2 591.2 593.3 C 589.6 595.2 589.6 595.3 591.5 594.2 C 594.6 592.6 597.8 588.8 599.5 584.6 C 601.5 579.9 601.4 579.7 596.8 582.1 M 639.2 597 C 631.5 600.9 631.7 601.3 640.6 600 C 649.3 598.8 652 598.8 652 600 C 652 601 647.5 602.4 637.5 604.5 L 631.5 605.8 634.5 607 C 643.3 610.7 655.7 608.7 665.6 602 L 670.3 598.7 665.4 596.7 C 656.6 593.1 646.6 593.3 639.2 597 M 623.8 629.4 C 629.8 635.8 631.1 638 629 638 C 628.5 638 624.8 635.1 620.8 631.5 C 612.9 624.5 611.6 624.5 615 631.5 C 618.7 639.1 631.4 648 638.5 648 C 643.5 648 633.5 630.9 625.7 626.2 C 617.9 621.5 617.3 622.5 623.8 629.4 M 339.5 644 C 331.4 646.1 323.5 652.2 319.9 659.2 C 316.9 665 317.2 665.4 324.2 664.6 C 334.5 663.4 341.5 659.5 347.1 651.7 C 351.5 645.7 350.8 645.5 341.2 650.5 C 336.4 653 332 655 331.5 655 C 329.8 655 334.7 650.6 340.5 646.9 C 346.4 643.1 346.1 642.3 339.5 644"
  };
  function seedArt() {
    var layer = function (cls, inner) { return '<svg class="sa-layer ' + cls + '" viewBox="0 0 896 1120" aria-hidden="true">' + inner + "</svg>"; };
    var line = function (cls, d) { return '<path class="' + cls + '" pathLength="1" d="' + d + '"/>'; };
    return '<div class="seed-art" role="img" aria-label="' + esc(t("sust.seed_alt")) + '">' +
      layer("sa-groundl", line("sa-ln sa-ground", "M72 940 H408 C430 940 440 925 465 925 C490 925 500 940 522 940 H824") +
        line("sa-ln sa-root", "M465 944 C462 972 440 994 404 1012") + line("sa-ln sa-root", "M466 944 C470 976 496 996 532 1010") +
        line("sa-ln sa-root", "M465 946 C466 990 462 1026 456 1062") + line("sa-ln sa-root sa-root2", "M436 995 C426 1004 416 1008 398 1036 M503 998 C512 1010 520 1018 540 1040")) +
      '<div class="sa-sproutw">' + layer("", '<g transform="translate(219.6 443.4) scale(.485)"><path fill-rule="evenodd" d="' + SEED_SVG.sprout + '"/></g>') + "</div>" +
      '<div class="sa-treew">' + layer("sa-treel", '<g transform="translate(132.4 106.7) scale(.744)"><path fill-rule="evenodd" d="' + SEED_SVG.tree + '"/></g>') + "</div>" +
      // Hand mit Samen; sobald der Samen in der Erde liegt, zeigt die Hand ihn nicht mehr (Ausschnitt statt Abdecken, Boden bleibt sichtbar)
      layer("sa-handl", '<defs><path id="sa-hand-p" fill-rule="evenodd" d="' + SEED_SVG.hand + '"/><clipPath id="sa-noseed"><path clip-rule="evenodd" d="M0 0H896V1120H0Z M452 369h34v37h-34Z"/></clipPath></defs>' +
        '<use class="sa-hand-a" href="#sa-hand-p"/><use class="sa-hand-b" href="#sa-hand-p" clip-path="url(#sa-noseed)"/>') +
      layer("sa-seedl", '<clipPath id="sa-seed-c"><rect x="452" y="369" width="34" height="37"/></clipPath><use href="#sa-hand-p" clip-path="url(#sa-seed-c)"/>') + "</div>";
  }
  function initSeedArt(root) {
    var el = $(".seed-art", root);
    if (!el) return;
    if (REDUCED || !("IntersectionObserver" in window)) { el.classList.add("is-done"); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { el.classList.add("is-play"); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    cleanups.push(function () { io.disconnect(); });
  }
  pages.durabilite = function (main) {
    main.innerHTML = pageHead(D.site.entetes.durabilite, t("nav.sustainability")) +
      '<section class="section"><div class="wrap wrap--narrow"><p class="lead">' + esc(t("sust.vision")) + "</p></div></section>" +
      '<section class="section section--off"><div class="wrap"><div class="split">' +
      seedArt() +
      '<div><span class="eyebrow">' + esc(t("sust.gc_eyebrow")) + '</span><h2 class="h-section">' + esc(t("sust.gc_title")) + "</h2>" +
      '<p class="lead" style="margin-top:24px">' + esc(t("sust.gc_text")) + "</p></div></div></div></section>" +
      '<section class="section"><div class="wrap"><h2 class="h-section" style="margin-bottom:32px">' + esc(t("sust.principles_title")) + '</h2><ul class="principles">' +
      ["p1", "p2", "p3", "p4"].map(function (k, i) { return '<li><span class="service__num">0' + (i + 1) + "</span><strong>" + esc(t("sust." + k)) + "</strong></li>"; }).join("") +
      "</ul></div></section>" +
      // statt der Projekte: Leitsatz und Haltung (Text von DRP)
      '<section class="quote quote--soft"><div class="wrap"><blockquote><p>' + esc(t("sust.value_quote")) + "</p></blockquote></div></section>" +
      '<section class="section section--tight"><div class="wrap wrap--narrow"><p class="lead">' + esc(t("sust.value_p1")) + '</p><p class="lead" style="margin-top:24px">' + esc(t("sust.value_p2")) + "</p></div></section>" +
      ctaBand();
    initSeedArt(main);
  };

  pages.about = function (main) {
    var p = function (id, n) { return (byId(id) || { images: [] }).images[n || 0]; };
    // Über uns: Kopf wie alte About-Seite, dann das Team, darunter der Rest der Seite
    main.innerHTML = titleHead(t("nav.about")) + teamSection() +
      '<section class="section section--off"><div class="wrap"><div class="split">' + img(p("residences-blanchy-rene-bascharage", 1), "", "r-4x5") +
      '<div><p class="lead">' + esc(t("about.p1")) + "</p></div></div></div></section>" +
      '<section class="section"><div class="wrap"><div class="split"><div><h2 class="h-section">' + esc(t("about.h2")) + '</h2><p class="lead" style="margin-top:24px">' + esc(t("sust.vision")) + "</p>" +
      '<p class="lead">' + esc(t("about.p2")) + '</p><a class="link-arrow" href="durabilite.html">' + esc(t("about.sust_link")) + "</a></div>" +
      img(p("buy-penthouse-08-residence-xxc-steinsel", 6), "", "r-4x5") + "</div></div></section>" +
      '<section class="section section--tight"><div class="wrap"><h2 class="h-section" style="margin-bottom:32px">' + esc(t("about.pillars")) + '</h2><ul class="principles">' +
      ["product", "policies", "processes", "proactivity"].map(function (k) { return "<li><strong>" + esc(t("about." + k)) + "</strong><span>" + esc(t("about." + k + "_t")) + "</span></li>"; }).join("") +
      "</ul></div></section>" +
      ctaBand();
  };

  /* Team wie auf der alten Team-Seite: drei Partner, Zwischentitel „Team“, sechs Mitarbeiter. Links wie früher. */
  function teamSection() {
    function person(m) {
      var internal = /^\/team\//.test(m.url);
      var href = internal ? "membre.html?id=" + encodeURIComponent(m.id) : m.url;
      return '<a class="person" href="' + esc(href) + '"' + (internal ? "" : ' target="_blank" rel="noopener"') + ">" +
        img(m.photo, m.nom, "r-2x3") + "<h3>" + esc(m.nom) + "</h3><p>" + esc(m.role) + "</p>" +
        (internal ? "" : '<span class="visually-hidden"> (' + esc(t("common.opens_new")) + ")</span>") + "</a>";
    }
    function group(g) { return '<div class="team-grid">' + D.team.filter(function (m) { return m.groupe === g; }).map(person).join("") + "</div>"; }
    return '<section class="section" id="team"><div class="wrap">' + group("associes") +
      '<h2 class="h-section" style="margin:clamp(64px,8vw,112px) 0 clamp(28px,4vw,48px)">' + esc(t("team.title")) + "</h2>" + group("equipe") +
      "</div></section>";
  }

  pages.team = function (main) {
    main.innerHTML = titleHead(t("nav.team"), t("team.lead")) + teamSection() + ctaBand(); // ohne Foto, wie Über uns/Kontakt
  };

  pages.membre = function (main) {
    var m = member(param("id"));
    if (!m || !txt(m.bio).length) { pages.notfound(main); return; }
    document.title = m.nom + " – DRP Group";
    main.innerHTML =
      '<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:clamp(32px,5vw,64px)"><a href="index.html">DRP Group</a> / <a href="team.html">' + esc(t("nav.team")) + "</a></nav>" +
      '<div class="split split--top" style="padding:clamp(16px,3vw,40px) 0 clamp(64px,10vw,140px)">' +
      '<div style="max-width:440px">' + img(m.photo_profil || m.photo, m.nom, "r-2x3", true) + "</div>" +
      '<div><span class="eyebrow">' + esc(m.role) + '</span><h1 class="h-display">' + esc(m.nom) + '</h1><div class="prose" style="margin-top:32px">' + prose(txt(m.bio)) + "</div>" +
      '<div class="btn-row" style="margin-top:32px"><a class="btn" href="contact.html">' + esc(t("cta.secondary")) + '</a><a class="btn btn--ghost" href="team.html">' + esc(t("team.back")) + "</a></div></div></div></div>" +
      ctaBand();
  };

  pages.notfound = function (main) {
    document.title = t("meta.notfound");
    main.innerHTML =
      '<div class="wrap wrap--narrow" style="padding:clamp(80px,14vw,180px) var(--gutter)"><span class="eyebrow">404</span><h1 class="h-display">' + esc(t("notfound.title")) + "</h1>" +
      '<p class="lead" style="margin-top:24px">' + esc(t("notfound.text")) + "</p>" +
      '<div class="btn-row" style="margin-top:32px"><a class="btn" href="index.html">' + esc(t("notfound.home")) + '</a><a class="btn btn--ghost" href="biens.html">' + esc(t("nav.properties")) + '</a><a class="btn btn--ghost" href="contact.html">' + esc(t("nav.contact")) + "</a></div></div>";
  };

  // Seitenanfang ohne Foto, nur der Titel (wie beim Datenschutz)
  function titleHead(text, lead) { return '<div class="wrap page-title"><h1 class="h-display">' + esc(text) + "</h1>" + (lead ? '<p class="lead">' + esc(lead) + "</p>" : "") + "</div>"; }

  /* Datenschutzerklärung (Text der alten Seite, legal.js) – nur auf Englisch vorhanden */
  pages.datenschutz = function (main) {
    var L = (window.DRP_LEGAL || {}).privacy || {};
    // ohne Kopfbild, Text über die ganze Breite
    main.innerHTML = titleHead(t("footer.privacy")) + '<div class="wrap legal">' +

      '<div class="prose" lang="en">' + (L.en || "") + "</div></div>" +
      '<div style="height:clamp(64px,10vw,140px)"></div>';
  };

  pages.contact = function (main) {
    var s = D.site;
    var ref = byId(param("ref"));
    var visit = param("sujet") === "visite";
    main.innerHTML =
      titleHead(t("nav.contact"), t("contact.lead")) +
      '<div class="wrap"><div class="split split--top" style="padding:clamp(48px,6vw,96px) 0 clamp(64px,10vw,140px)"><div>' +
      '<ul class="keyfacts" style="margin-bottom:32px">' +
      "<li><span>" + esc(t("contact.address")) + "</span><span>" + esc(s.societe) + "<br>" + s.adresse.map(esc).join("<br>") + (s.adresse_note ? "<br><small class=\"muted\">(" + esc(s.adresse_note) + ")</small>" : "") + "</span></li>" +
      "<li><span>" + esc(t("contact.phone")) + "</span><span>" + s.telephones.map(function (p) { return '<a href="' + p.href + '">' + esc(p.label) + "</a>"; }).join("<br>") + "</span></li>" +
      "<li><span>" + esc(t("contact.email")) + '</span><span><a href="mailto:' + s.email + '">' + esc(s.email) + "</a></span></li></ul>" +
      '<div class="mini-map" id="mini-map" role="img" aria-label="' + esc(s.societe + ", " + s.adresse.join(", ")) + '"></div></div>' +
      '<div><h2 class="h-section" style="margin-bottom:28px">' + esc(t("contact.form_title")) + "</h2>" +
      '<form class="form" novalidate data-form="contact"><div class="form-grid">' +
      field("subject", t("contact.subject"), '<select id="f-subject" name="subject"><option value="general">' + esc(t("contact.subject_general")) + '</option><option value="visit"' + (visit ? " selected" : "") + ">" + esc(t("contact.subject_visit")) + "</option></select>", "full") +
      (ref ? field("ref", t("contact.about_item"), '<input id="f-ref" name="ref" type="text" readonly value="' + esc(ref.titre) + '">', "full") : "") +
      field("name", t("form.name"), '<input id="f-name" name="name" type="text" autocomplete="name" required>', "full") +
      field("email", t("form.email"), '<input id="f-email" name="email" type="email" autocomplete="email" required>') +
      field("phone", t("form.phone"), '<input id="f-phone" name="phone" type="tel" autocomplete="tel" data-optional>', "", true) +
      field("message", t("form.message"), '<textarea id="f-message" name="message" required></textarea>', "full") +
      "</div>" + privacyField() +
      '<p class="muted" style="font-size:.85rem;margin:0">' + esc(t("form.recipient")) + "</p>" +
      '<div><button class="btn" type="submit">' + esc(t("form.send")) + "</button></div></form></div></div></div>" + ctaBand();
    initForm(main);
    var miniEl = $("#mini-map", main);
    loadLeaflet().then(function (L) {
      var el = miniEl; if (!el || !document.body.contains(el)) return;
      var map = baseMap(L, el, {});
      map.setView([s.lat, s.lng], 16); // genaue Adresse des Büros
      L.marker([s.lat, s.lng], { icon: markerIcon(L, [{ type: "projet", statut: "" }]), title: "DRP Group", alt: "DRP Group" }).addTo(map);
    });
  };

  pages.estimation = function (main) {
    // alle Ortschaften Luxemburgs (js/places.js, OpenStreetMap) als Vorschläge; freie Eingabe bleibt möglich
    var communes = uniq((window.DRP_PLACES || []).map(function (p) { return p[0].split("|")[0]; }).concat(D.items.map(function (i) { return i.localite; })));
    main.innerHTML =
      pageHead(D.site.entetes.estimation, t("nav.cta")) +
      '<div class="wrap wrap--narrow"><div class="page-intro"><p class="lead">' + esc(t("form.lead")) + "</p></div>" +
      '<form class="form" novalidate data-form="estimation" style="padding-bottom:clamp(64px,10vw,140px)">' +
      '<h2 class="h-small">' + esc(t("form.property")) + '</h2><div class="form-grid">' +
      field("type", t("form.type"), '<select id="f-type" name="type" required><option value="">' + esc(t("form.type_choose")) + "</option>" +
        ["apartment", "house", "penthouse", "other"].map(function (k) { return '<option value="' + k + '">' + esc(t("form.type_" + k)) + "</option>"; }).join("") + "</select>") +
      field("commune", t("form.commune"), '<input id="f-commune" name="commune" type="text" list="dl-communes" autocomplete="address-level2" required><datalist id="dl-communes">' + communes.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>") +
      field("surface", t("form.surface"), '<input id="f-surface" name="surface" type="number" inputmode="decimal" min="1" step="any" required>') +
      field("rooms", t("form.rooms"), '<input id="f-rooms" name="rooms" type="number" inputmode="numeric" min="0" step="1" required>') +
      '</div><h2 class="h-small" style="margin-top:16px">' + esc(t("form.you")) + '</h2><div class="form-grid">' +
      field("name", t("form.name"), '<input id="f-name" name="name" type="text" autocomplete="name" required>', "full") +
      field("phone", t("form.phone"), '<input id="f-phone" name="phone" type="tel" autocomplete="tel" required>') +
      field("email", t("form.email"), '<input id="f-email" name="email" type="email" autocomplete="email" required>') +
      field("message", t("form.message"), '<textarea id="f-message" name="message" data-optional></textarea>', "full", true) +
      "</div>" + privacyField() +
      '<p class="muted" style="font-size:.85rem;margin:0">' + esc(t("form.recipient")) + "</p>" +
      '<div><button class="btn" type="submit">' + esc(t("form.submit")) + "</button></div></form></div>";
    initForm(main);
  };

  function field(name, label, control, cls, optional) {
    return '<div class="field ' + (cls || "") + '"><label for="f-' + name + '">' + esc(label) +
      (optional ? ' <span class="req">(' + esc(t("form.optional")) + ")</span>" : ' <span class="req" aria-hidden="true">*</span>') + "</label>" +
      control.replace(/^(<\w+)/, '$1 aria-describedby="e-' + name + '"') + '<span class="err" id="e-' + name + '"></span></div>';
  }
  function privacyField() {
    var link = '<a href="datenschutz.html" target="_blank">' + esc(t("form.privacy_link")) + "</a>";
    return '<div class="field"><div class="check"><input type="checkbox" id="f-privacy" name="privacy" required aria-describedby="e-privacy">' +
      '<label for="f-privacy" style="text-transform:none;letter-spacing:0;font-size:.9rem;color:var(--ink);font-weight:400">' + esc(t("form.privacy")).replace("{link}", link) + "</label></div>" +
      '<span class="err" id="e-privacy"></span></div>';
  }
  function initForm(root) {
    var form = $("form[data-form]", root);
    var tried = false;
    function check(el) {
      var v = (el.type === "checkbox" ? el.checked : el.value.trim());
      var msg = "";
      if (el.required && !v) msg = el.type === "checkbox" ? t("form.err_privacy") : t("form.err_required");
      else if (v && el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = t("form.err_email");
      else if (v && el.type === "tel" && !/^\+?[\d\s().\/-]{6,20}$/.test(v)) msg = t("form.err_phone");
      else if (v && el.type === "number" && (isNaN(+v) || +v < +(el.min || 0))) msg = t("form.err_number");
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      $("#e-" + el.name).textContent = msg;
      return !msg;
    }
    var fields = $$("input:not([readonly]), select, textarea", form).filter(function (el) { return el.name && el.name !== "subject"; });
    fields.forEach(function (el) { el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", function () { if (tried) check(el); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      tried = true;
      var bad = fields.filter(function (el) { return !check(el); });
      if (bad.length) { bad[0].focus(); return; }
      // Prototyp: kein Versand. Phase 2: Contact Form 7 → info@drp-group.lu
      form.outerHTML = '<div class="form-success" role="status" tabindex="-1"><h2>' + esc(t("form.ok_title")) + "</h2><p>" + esc(t("form.ok_text")) + '</p><p class="muted" style="margin:0;font-size:.85rem">' + esc(t("form.ok_proto")) + "</p></div>";
      $(".form-success", root).focus();
    });
  }

  /* ------------------------------------------------------------ hero (nur Startseite, statisch im HTML) */
  function initHero() {
    var m = $(".hero__media");
    if (!m) return;
    var hi = $(".hero__media img");
    hi.alt = t("home.hero_alt");
    $(".hero__scroll").setAttribute("aria-label", t("home.scroll"));
    $(".hero__scroll span").textContent = t("home.scroll");
    // im Admin ersetzt: neues Foto ohne neues Video → nur das Foto; Video entfernt → nur das Foto
    var imgNew = D.site.hero_image && D.site.hero_image !== "assets/hero/hero.jpg";
    var vidNew = D.site.hero_video_mp4 !== "assets/hero/hero.mp4";
    if (imgNew && hi.getAttribute("src") !== D.site.hero_image) { hi.removeAttribute("srcset"); hi.src = D.site.hero_image; }
    var key = (D.site.hero_video_webm || "") + "|" + (D.site.hero_video_mp4 || "");
    if ((imgNew && !vidNew) || key === "|") { $$("video", m).forEach(function (v) { v.remove(); }); m.classList.remove("has-video"); delete m.dataset.videoKey; return; }
    if (REDUCED || m.dataset.videoKey === key) return;
    $$("video", m).forEach(function (v) { v.remove(); }); m.classList.remove("has-video");
    m.dataset.videoKey = key;
    if (!hi.complete) { hi.addEventListener("load", function () { delete m.dataset.videoKey; initHero(); }, { once: true }); return; } // erst das Startfoto, dann das Video
    // Video-Slot: liegt assets/hero/hero.webm oder .mp4 vor, ersetzt es das Foto.
    var v = document.createElement("video");
    // Safari spielt nur stumme Videos von selbst ab – und prüft dafür die Attribute, nicht nur die Eigenschaften
    ["muted", "autoplay", "loop", "playsinline"].forEach(function (a) { v.setAttribute(a, ""); });
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
    v.setAttribute("aria-hidden", "true"); // kein Poster: das Foto liegt darunter, bis das Video läuft
    [[D.site.hero_video_webm, "video/webm"], [D.site.hero_video_mp4, "video/mp4"]].forEach(function (s) {
      if (!s[0]) return;
      var src = document.createElement("source"); src.src = s[0]; if (!/^blob:/.test(s[0])) src.type = s[1]; v.appendChild(src);
    });
    v.addEventListener("playing", function () { m.classList.add("has-video"); });
    v.addEventListener("pause", function () { m.classList.remove("has-video"); }); // vom System angehalten → Foto statt Abspieltaste
    $$("source", v).pop().addEventListener("error", function () { v.remove(); });
    m.appendChild(v);
    // Safari lehnt zu frühe Versuche ab (Seite noch im Aufbau) → einige Male kurz danach wiederholen
    var tries = 0;
    function play() {
      var p = v.play();
      if (p && p.catch) p.catch(function () { if (++tries < 20 && v.isConnected) setTimeout(play, 300 + 200 * Math.min(tries, 5)); });
    }
    v.addEventListener("canplay", play, { once: true });
    if (document.readyState !== "complete") window.addEventListener("load", function () { if (v.paused) { tries = 0; play(); } }, { once: true });
    play();
    // Stromsparmodus/Einstellung blockiert Autoplay: bei der ersten Berührung, Taste oder Mausbewegung starten
    function kick() { if (v.paused && v.isConnected) play(); ["pointerdown", "touchstart", "keydown", "pointermove", "scroll"].forEach(function (ev) { window.removeEventListener(ev, kick); }); }
    ["pointerdown", "touchstart", "keydown", "pointermove", "scroll"].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
  }

  /* ------------------------------------------------------------ render */
  function render() {
    D = window.DRP_DATA; I = window.DRP_I18N;
    if (window.DRP_EDIT) window.DRP_USED = {};
    cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    cleanups = [];
    document.documentElement.lang = lang;
    var fav = $('link[rel="icon"]'); if (fav && D.site.logo && fav.getAttribute("href") !== D.site.logo) fav.href = D.site.logo;
    var metaKey = { home: "home", biens: "properties", bien: "properties", projets: "projects", projet: "projects", carte: "map", durabilite: "sustainability",
      estimation: "valuation", about: "about", team: "team", membre: "team", contact: "contact", services: "services", notfound: "notfound", bereich: "home", merkliste: "favorites", datenschutz: "privacy" }[PAGE];
    document.title = t("meta." + metaKey);
    $(".skip-link").textContent = t("common.skip");
    header();
    initHero();
    var main = $("#main");
    main.innerHTML = "";
    function fill() {
      // im Admin gelöschte Seite: Besucher sehen „nicht gefunden“, der Admin sieht sie weiter (zum Wiederherstellen)
      var pg = !window.DRP_EDIT && isHidden(location.pathname) ? "notfound" : PAGE;
      if (pages[pg]) pages[pg](main);
      footer(); pruneLinks();
      if (keepY !== null) { main.style.minHeight = ""; window.scrollTo({ top: keepY, behavior: "instant" }); keepY = null; }
      reveal(main); APP.rendered(main);
    }
    // Startseite: alles unter dem Hero erst nach dem ersten Paint aufbauen, damit das Hero-Foto zuerst lädt
    var hero = $(".hero__media img");
    if (!hero) return fill();
    var later = function () { requestAnimationFrame(function () { requestAnimationFrame(fill); }); };
    if (hero.complete) later(); else { hero.addEventListener("load", later, { once: true }); hero.addEventListener("error", later, { once: true }); }
  }
  /* Im Admin gelöschte Seiten (data.site.hidden_pages): alle Links darauf verschwinden */
  function isHidden(href) {
    var f = String(href || "").split(/[?#]/)[0].split("/").pop() || "index.html";
    return (D.site.hidden_pages || []).indexOf(f) > -1;
  }
  function pruneLinks() {
    if (!(D.site.hidden_pages || []).length) return;
    $$("a[href]").forEach(function (a) {
      if (!isHidden(a.getAttribute("href")) || /^(https?:|mailto:|tel:|#)/.test(a.getAttribute("href"))) return;
      var li = a.closest("li");
      (li && li.closest("nav, footer, .mobile-menu, .sub") ? li : a).remove();
    });
  }

  /* Schnittstelle für den Admin-Bereich (js/admin.js) */
  var APP = window.DRP_APP = {
    render: render, t: t, page: PAGE, param: param, url: url, isHidden: isHidden,
    loadLeaflet: loadLeaflet, baseMap: baseMap, markerIcon: markerIcon,
    lang: function () { return lang; }, langs: LANGS, setLang: setLang,
    hooks: [], rendered: function (root) { APP.hooks.forEach(function (fn) { fn(root); }); }
  };
  // gespeicherte Änderungen (js/storage.js) zuerst laden, dann aufbauen
  (window.DRP_READY || Promise.resolve()).then(render, render);
})();
