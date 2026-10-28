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
    var DELAY = 7000, timer, stopped = REDUCED || !!window.DRP_EDIT, held = false, seen = false;
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

  /* DRP Senses: Einleitung, drei Leistungs-Boxen (wie „Unsere Unternehmen“), Wortband, das beim Scrollen gleitet */
  var SENSES_ICON = [
    VENTURE_ICON.senses,
    ventureSvg(["M32 8 L54 20 V44 L32 56 L10 44 V20 Z", "M10 20 L32 32 L54 20", "M32 32 V56", "M21 14 L43 26 V34"]),
    ventureSvg(["M8 12 H46 V38 H24 L14 48 V38 H8 Z", "M18 30 V25 M27 30 V20 M36 30 V16", "M50 22 H56 V52 H32 V44"])
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
      '<div class="ventures ventures--3 ventures--static">' + SENSES_ICON.map(function (icon, i) {
        var n = i + 1;
        return '<div class="venture">' +
          '<span class="venture__top"><span class="venture__num" aria-hidden="true">0' + n + "</span>" + icon + "</span>" +
          '<span class="venture__body"><span class="venture__name">' + esc(t("senses.s" + n + "_t")) + '</span><span class="venture__line">' + esc(t("senses.s" + n + "_p")) + "</span></span></div>";
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
  /* Hand legt einen Samen in die Erde, daraus wächst ein Baum. Linienzeichnung (Vorlage: Higgsfield, vektorisiert),
     in Ebenen: Hand gleitet herein, Samen fällt, Boden zeichnet sich, Baum wächst von unten nach oben. */
  var SEED_SVG = {
    hand: "M 844 137.5 C 781.7 158 785 156.8 785 158.4 C 785 159.2 780.7 160.9 773.8 162.9 C 748.8 170 748.9 170 747.8 173 C 746.8 175.9 738.5 178 712 182.1 C 691.6 185.2 660.6 180.8 573.2 162.4 C 545.8 156.7 544.6 157 526.2 175.6 C 518.9 183 507.4 193.4 500.7 198.7 C 480 215.2 456.6 235.1 454.2 238.4 C 451.6 242 450.4 246 449.6 255 C 449.2 258.6 447.5 271.9 445.9 284.5 C 442.5 309.4 442.5 311.3 445.4 342.5 C 446.2 351.3 447.3 359.7 447.9 361.2 C 449.5 365.4 455.9 366.9 462.3 364.4 C 463.4 364 463.3 365 461.7 369.7 C 457.6 381.7 459.8 395.6 466.9 402.4 L 469.7 405.1 472.7 401.6 C 477.4 396.3 479.3 389.3 478.8 379.6 C 478.5 375.2 477.9 370.7 477.5 369.7 C 476.9 368.2 477.1 368.1 479.5 369 C 486.8 371.8 494.5 369.5 516.8 358 C 525.3 353.6 532.9 350 533.7 350 C 534.4 350 539.9 354.7 546 360.5 C 556.1 370.1 557.3 371 560.9 371 C 568.1 371 573.9 362.7 572.7 354.1 L 572.2 350.2 578.3 354.1 C 581.7 356.3 585.5 358.3 586.8 358.7 C 595.1 360.8 601.2 350.4 597.7 340.2 C 596.1 335.6 596.3 335.4 600 337.5 C 611.4 344 618.1 329.4 609 317.9 L 606.1 314.2 610.3 312.7 C 612.6 311.8 622.4 310.2 632 309 C 667.6 304.7 678.1 300.5 707.1 279.6 C 716.1 273.2 763.2 258.7 770.6 260.2 C 771.8 260.4 773.9 265.1 777.9 277 C 784.6 296.6 782.7 295.6 802.1 290.9 C 821.6 286.2 820.5 286.3 822 289.9 C 823.7 294 822.1 294.2 861.5 284.6 C 888 278.1 895.6 275.9 895.8 274.6 C 896 273.6 895.6 273.2 894.8 273.5 C 891.9 274.5 828.4 290 827 290 C 825.8 290 825.1 288.1 824.2 282.8 C 818.9 252.1 803.8 197.1 793 169.7 C 790.7 163.7 789 158.7 789.1 158.6 C 789.8 158 893.8 124 894.9 124 C 895.5 124 896 123.3 896 122.5 C 896 120.2 897 119.9 844 137.5M 543.3 163.9 C 540.6 165.1 534.7 170.4 527.3 178.1 C 520.8 184.8 509.9 194.8 503 200.3 C 453.4 240.3 453.6 240 452 256.4 C 451.5 261.4 449.8 276 448.1 288.9 C 444.7 314.4 445 327.9 449 336 C 451.2 340.4 453.3 352.6 452.8 358.2 L 452.5 362.5 456.9 362.4 C 467.3 362.2 474 347.3 474.8 322.9 L 475.2 309.3 470.6 308 C 464.4 306.3 464.8 304.9 471.2 305.2 C 476.4 305.5 476.5 305.4 478.3 301.8 C 480.5 297.3 485.5 277.5 486.3 270.2 L 486.9 264.9 482.5 262.2 C 475.6 258.1 476.9 256.3 483.9 260.2 L 489.8 263.5 494.7 261.1 C 501.9 257.6 511.2 250.7 516.4 244.9 C 521.1 239.7 521.1 239.5 520.5 234.6 C 519.7 229 520.7 229.1 523.9 235 C 525.9 238.8 531.1 242 535.5 242.1 C 537.1 242.1 539.4 242.5 540.5 243 C 542.4 243.8 542.4 243.8 540.1 244.7 C 537.8 245.6 538 245.9 544.1 248.7 C 553 252.9 562.5 256.3 564.3 255.8 C 565.5 255.6 564.6 252.8 559.8 243 C 552.3 227.5 550.6 223 551.9 221.7 C 552.6 221 553.2 221.3 553.6 222.6 C 553.9 223.6 557.4 231.2 561.2 239.4 C 565 247.6 568.9 256.2 569.8 258.4 L 571.4 262.4 572.8 259 C 573.5 257.2 574.4 252.6 574.7 248.8 C 575 245.1 575.7 242 576.3 242 C 577.2 242 576.9 249.4 575.6 260.7 C 575.2 264.1 570.4 270.3 562.6 277.8 C 553.3 286.6 546.9 290.8 527 300.8 C 497.4 315.7 476.3 334.9 472.9 350 C 471.1 358 475.2 365.1 482.5 366.8 C 488 368 492.2 366.4 502.2 359.4 C 510.3 353.7 514.3 352.8 508 358.1 C 506.1 359.7 504.9 361 505.2 361 C 507 361 543.7 340.9 553.2 334.8 C 567.3 325.8 581.2 319.2 598.5 313.6 C 606.2 311.1 615.1 307.4 618.3 305.4 C 624.7 301.4 626.8 301.5 622.4 305.5 L 619.5 308.1 623 307.5 C 624.9 307.3 631.9 306.3 638.5 305.4 C 666.1 301.6 682.9 294.8 703 279.1 C 713.7 270.7 717 268.5 715.5 271 C 714.6 272.4 714.7 272.4 725.6 268.4 C 736.8 264.4 755.2 259.7 767 257.9 C 771.4 257.2 775 256.2 775 255.7 C 775 250 753.8 181.7 751.1 178.7 C 750.7 178.3 741.6 179.6 730.9 181.7 C 695 188.5 684.8 187.7 601.5 170.8 C 557.2 161.8 549.8 160.9 543.3 163.9M 772.5 166 C 765.4 168.1 757.6 170.3 755.3 170.9 L 751.1 172 753.6 177.6 C 761.1 194.7 774 238.6 782.5 276.3 C 784.4 284.5 786.1 291.4 786.3 291.6 C 786.6 292 821.1 284.1 821.8 283.5 C 822.1 283.2 814.8 251.1 810.5 234.4 C 801.9 200.8 788.8 161.8 786.2 162.1 C 785.8 162.1 779.6 163.8 772.5 166M 520.3 244.4 C 518.6 246.8 513.6 251.6 509.1 255 C 493.2 267.3 489 279.9 497 291.5 C 498.6 293.8 501.3 298.4 503 301.8 C 504.7 305.2 506.5 308 507 308 C 507.4 308 510.7 306.4 514.2 304.4 C 517.6 302.4 523.8 299.3 527.8 297.4 L 535.1 294.1 532.6 289.2 C 529.5 283.1 528.6 282.3 522.8 281.5 C 519.6 281 518 280.3 518 279.3 C 518 278.4 518.7 278 519.8 278.3 C 524.6 279.7 529.2 280 530.9 279.1 C 535.1 276.8 543.1 260.1 543 253.8 C 542.9 251.3 539.7 248.7 531.2 244.4 C 528.3 242.9 525.7 241.4 525.4 240.9 C 524.4 239.3 523.4 240 520.3 244.4M 544.6 259 C 542.6 266.5 538.1 275.5 534.7 279.2 L 532.1 282 534.3 287 C 536.9 293 536.7 292.9 544.7 288.3 C 551.7 284.2 552.4 283 548 283 C 546.4 283 545 282.6 545 282 C 545 281.4 546.9 281 549.3 281 C 556.5 281 559.5 277.4 562.4 265.3 L 563.8 259.3 556.6 256.8 C 552.7 255.4 548.8 254 547.9 253.6 C 546.7 253.1 546 254.2 544.6 259M 564.7 267 C 563.1 273.6 563.9 273.8 568.1 267.9 C 569.8 265.5 569.9 264.8 568.8 263 C 566.9 260 566.4 260.5 564.7 267M 491.8 265.6 C 490.1 266.5 489 267.9 489 269.1 C 489 276 482.4 301.1 479.2 306 C 478 307.9 477.6 311.4 477.6 321.6 L 477.5 334.8 482.7 329.1 C 485.5 325.9 491.1 320.7 495.2 317.5 C 499.2 314.2 502.9 311.3 503.3 310.9 C 504.3 310.1 499.3 300 494.2 292.2 C 489.3 284.8 488.9 276 493.2 269.3 C 497.1 263.4 496.8 262.8 491.8 265.6M 591.8 318.6 C 587.5 320 584 321.4 584 321.9 C 584 323.4 589.6 326.7 593.5 327.4 C 596.1 327.9 598.7 329.5 601.3 332.1 C 605.7 336.5 607 336.8 609.3 334.2 C 612.4 330.8 611 323.7 606.2 318.8 C 603.1 315.4 601.7 315.4 591.8 318.6M 571.8 327 C 567.6 329.2 563.9 331.4 563.6 331.9 C 562.4 333.8 570.3 344 573 344 C 577 344 583.3 348.2 585.5 352.3 C 587.9 356.8 590.9 357.2 593.9 353.4 C 598.6 347.5 595 336.1 586 327.6 C 580.2 322.1 581.3 322.2 571.8 327M 593 330.9 C 593 331.9 600.3 335 601 334.3 C 601.3 334 600.4 333 599.1 331.9 C 596.7 329.9 593 329.3 593 330.9M 550.4 339.8 C 545.4 342.9 540.3 346.1 539 346.8 C 536.9 348.1 536.9 348.2 538.6 350.1 C 539.5 351.1 541.3 352 542.5 352 C 547.3 352 555.9 359.1 558.5 365.3 C 560.4 369.9 562.2 370 566.6 365.6 C 570.4 361.8 571.1 356.5 568.9 348.5 C 567.8 344.5 561.4 334 560.2 334 C 559.8 334.1 555.4 336.6 550.4 339.8M 448.1 343.5 C 447.9 348.5 449.2 357 450.1 357 C 451.3 357 451 351.4 449.5 345.5 C 448.5 341.4 448.2 341 448.1 343.5M 572 346.4 C 572 347.2 583 354.3 583.6 353.8 C 584.9 352.5 581.8 349.1 578 347.6 C 574.1 346 572 345.6 572 346.4M 549.5 359.9 C 552.8 363.3 555.8 366 556.2 366 C 557.9 366 553.9 360 550.8 357.7 C 544.3 352.9 543.6 354 549.5 359.9M 466.2 365.7 C 461.3 376.7 460.9 387.1 465.2 395.3 L 467.4 399.5 468.1 394.5 C 468.5 391.8 468.9 383.2 468.9 375.6 C 469 356 470.3 359.6 471 381.3 L 471.6 399.5 473.7 395 C 477.9 386.1 477.4 375.4 472.2 365.1 C 469.8 360.2 468.7 360.3 466.2 365.7",
    scene: "M 438.7 488.4 C 426.5 493.5 418.8 502.8 416.5 515.2 C 416.1 517.3 415.6 519 415.5 519 C 415.3 519 412.9 517.8 410 516.3 C 397.6 509.9 380.2 515.6 375.9 527.5 C 374.9 530 373.9 530.9 370.4 531.8 C 358.6 535 352.3 549.5 356.9 562.8 L 358.7 568 355 569 C 348.1 570.9 342.9 577.6 344.2 582.8 C 344.6 584.3 343.8 584.5 338.6 584.5 C 322.4 584.7 311.2 601.1 318 614.5 C 319.1 616.7 319.6 618.6 319.1 618.8 C 316.1 619.8 309.5 625.7 307 629.6 C 293 651.7 313.3 680.2 339 674.7 L 342.6 674 342.6 679.4 C 342.6 691 355.8 699 366.2 693.6 C 369 692.1 369 692.2 369 695.1 C 369 699.9 371.5 704.5 375.4 706.9 C 377.7 708.4 379 709.9 379 711.3 C 379 712.5 380.2 716.2 381.5 719.5 C 384.4 726.5 384.3 726 382.8 726 C 382.1 726 380.1 724.5 378.5 722.8 C 371.4 715.5 360 713.3 349.2 717 C 344.9 718.6 345.1 720.2 350.8 725.8 C 358.1 733.2 366 734.7 377 731 C 384.4 728.5 386.3 728.9 392.9 734.7 C 398.8 739.9 399 741.1 393.4 737.8 C 387.3 734.2 377.9 734.5 371.4 738.5 C 365.5 742.2 365.3 743.7 370.5 746.4 C 378.3 750.4 392.4 749.1 395.5 744 C 395.8 743.5 397.4 743 399.1 743 C 407.3 743 447.8 790.9 448.1 800.9 C 448.6 821.4 446.6 897.3 445.4 903.1 C 444.8 906.3 437.6 910 432.1 910 C 428.1 910 424 912.3 418.5 917.4 C 414.1 921.6 409.6 923.2 404.5 922.4 C 398 921.5 394.7 922.6 388.5 928.1 C 383 932.9 382.8 933 377.7 932.4 C 371.3 931.7 365.6 933.6 359.7 938.3 C 357.4 940.2 354.6 942.1 353.5 942.6 C 352.4 943.1 291 943.7 210 944 C 116.4 944.3 68.6 944.8 68.8 945.5 C 69.1 947 349.5 946.9 353.7 945.3 C 355.5 944.7 359.5 942.2 362.6 939.8 C 368.2 935.6 368.6 935.5 376.9 935.1 L 385.5 934.8 390.8 929.9 L 396.2 925 403.5 925 C 412.4 925 415.1 924.1 420.6 919 C 425.7 914.3 430 912 433.7 912 C 435.3 912 439 911.1 442 910.1 L 447.5 908.2 448.2 901.8 C 449.3 891.2 451.2 824.3 450.9 810 C 450.5 794.8 450.1 794 439 779.5 C 431.7 770 432.1 769.9 441.1 778.8 C 445.8 783.3 450 787 450.7 787 C 451.4 787 452 780.2 452.5 765.2 C 452.8 753.3 453.5 735.4 453.9 725.5 L 454.7 707.5 454.9 727.2 C 454.9 739.6 455.4 747 456 747 C 456.5 747 458.9 745.3 461.2 743.2 C 465.7 739.2 465.6 739.3 459.8 748.4 L 456 754.3 456 781.4 C 456 810.7 456.7 825 458.2 825 C 458.8 825 461.7 822.9 464.7 820.3 L 470.3 815.5 465.8 822 C 463.3 825.6 460.3 830.5 459 832.9 L 456.8 837.3 457.9 869.6 C 458.5 887.4 459.3 903.3 459.6 905 C 460.4 908.6 466.9 912 472.9 912 C 477.2 912 482 914.7 485.2 919 C 488.6 923.7 491.9 925 500.1 925 C 507 925 514 927.5 514 930 C 514 933 519.2 936.8 524.1 937.2 C 528.1 937.6 529.7 938.3 531.9 940.8 C 537.4 946.7 530 946.4 685.3 946.8 C 800.5 947 828.1 946.8 827.8 945.8 C 827.4 944.8 798.7 944.4 684.4 944 C 529.9 943.5 538.6 943.8 532.5 938 C 530.5 936.1 528 934.9 524.8 934.5 C 520.8 933.9 519.5 933.1 516.5 929.4 C 511.3 923.1 508 921.6 500.6 922.3 C 493.7 922.9 490.3 921.6 487.1 917.1 C 484.2 913.1 479 910 475.1 910 C 473.3 910 469.7 909.1 467.1 907.9 L 462.3 905.9 461.7 896.2 C 461.3 890.9 460.7 875.5 460.4 862 L 459.7 837.5 462.3 832.4 C 466.7 823.8 476.6 811.6 487.3 801.6 C 498.9 790.8 501.4 789.7 506.2 793.3 C 513.2 798.6 522.7 799.3 530.7 795.1 C 538.4 791.2 538.1 789.2 529 785.1 C 521.3 781.6 510.2 782.8 504.8 787.7 C 503.8 788.6 502.8 789.1 502.5 788.8 C 501.3 787.6 513.2 778.8 518 777.4 C 526.9 774.8 532.9 767.5 534.9 756.6 C 536 750.9 535 750.2 528.5 752 C 519 754.6 511 764.3 511 773.1 C 511 776.3 510.3 777.3 505.5 781.5 C 499.4 786.6 498.4 786.6 503 781.4 C 508.5 775.1 509.2 763.5 504.5 756.3 C 498.4 747 489.1 770.7 494.9 780.5 C 498.8 787.2 498.7 787.4 478.2 805 L 459.5 821.1 458.8 789.3 L 458 757.5 460.6 752.4 C 462.9 747.8 478.4 726 479.4 726 C 479.6 726 482.3 727.2 485.5 728.6 C 499.1 734.9 515.9 726.4 516 713.1 C 516 710.6 516.4 709.9 517.4 710.3 C 536.4 717.6 555.8 705.9 556 687 C 556 681 554.6 676.1 551.5 672 L 548.9 668.5 554 667.8 C 567.7 665.7 576 653.9 571.6 642.8 L 570 638.7 573.6 634.7 C 590.8 615.7 577.8 584.4 551.7 582.3 L 545.4 581.8 547.2 576.6 C 549.3 570.5 549.4 567.8 547.6 562.7 C 543.5 551.5 534.8 545.5 523.5 546.2 L 517 546.6 517 543.5 C 517 540 516.4 539 513.1 536.8 C 511 535.3 510.7 534.4 510.6 526.7 C 510.5 517.5 508.6 513.8 501.7 508.6 C 498.6 506.3 489.3 505.3 486.2 506.9 C 484.3 507.9 483.9 507.6 482.5 504.6 C 475.3 489.5 454.5 481.8 438.7 488.4M 445.9 489 C 431.7 491.4 421.4 502.6 418.7 518.4 L 417.4 526 414 522.5 C 404.5 512.7 386.3 514.8 379.5 526.4 C 378.1 528.7 377 531.4 377 532.3 C 377 533.6 376.1 534 373.6 534 C 360.4 534 353.3 555.5 362.6 567.7 C 365.4 571.3 364.6 572.4 359.6 571.5 C 351.2 569.9 345.6 577.4 348.1 587 C 348.3 587.9 347.9 588.4 347 588.2 C 336.6 585.9 329.3 587.7 323.6 594 C 318.2 600 317.4 610 322 616.2 C 323.2 617.8 324 619.3 323.8 619.5 C 323.7 619.6 321.7 620.7 319.4 621.8 C 300.1 631.5 300.6 659.5 320.4 669.7 C 326.8 673.1 338.4 673.5 343.8 670.6 C 348 668.4 348.6 668.9 346.5 673.1 C 339.4 686.8 358.9 699.6 369.3 688 C 372.5 684.5 374.4 684.8 373 688.6 C 370.1 696.1 373.2 704.3 379.3 705.2 C 380.5 705.4 381.4 706.1 381.2 706.8 C 381.1 707.5 382.4 712.1 384.1 717.1 C 387.1 725.4 387.7 726.5 393.7 731.7 C 400.8 737.9 403.2 738.2 397.7 732.1 C 390.4 724 388.7 715.2 392.4 704.2 C 394.5 698 395.7 697.8 400 702.7 C 407.4 711.1 409.5 722.5 405.1 731.1 C 401.4 738.5 401.4 738.5 426.2 761.2 L 448.9 782 449.4 777.7 C 449.7 775.4 450.3 757.1 450.8 737 L 451.7 700.5 446.9 690.1 C 441.8 679.4 441.4 678 442.9 678 C 443.4 678 446.1 682.7 449.1 688.4 C 452 694.2 454.7 698.7 455.1 698.5 C 455.4 698.2 457.9 694.2 460.5 689.6 C 463.1 684.9 466.1 680.3 467.1 679.4 C 470.1 676.7 469.4 679.5 465.6 685.9 C 457.2 699.9 457 700.6 457.1 715.7 C 457.2 723.3 457.5 732.4 457.9 736 L 458.5 742.5 468 733 C 473.2 727.7 478.9 721.7 480.6 719.5 C 483.9 715.4 486.4 715.1 483.6 719.2 C 481.2 722.6 481.6 723.8 486.1 726 C 498.9 732.6 516 722.2 513.5 709.3 C 512.8 705.5 513.4 705.3 518.1 707.7 C 526.4 711.9 538 710.1 545.7 703.6 C 556.2 694.8 555.5 676.5 544.3 668.5 C 540.1 665.5 538.4 662.1 541.8 663.5 C 558.2 670.1 576.4 654.9 568.1 641.5 L 566.3 638.5 571.1 633.4 C 582.3 621.4 581.2 603.3 568.5 592.2 C 562 586.5 555.7 584.6 545.8 585.3 C 541.5 585.6 538 585.7 538 585.5 C 538 585.3 539.3 583.8 540.9 582.2 C 549.2 573.9 546.5 558.3 535.6 551.5 C 530.2 548.2 520.8 547.4 516.2 549.9 C 513 551.6 511.9 550.5 513.6 547.2 C 514.3 545.7 515 543.9 515 543.2 C 515 541.1 511.1 538 508.5 538 C 506.1 538 505 535.7 506.9 534.6 C 508.5 533.6 509 526 507.9 521.4 C 505.3 511 494.2 506 483.9 510.4 C 482.6 511 481.9 510.3 481.1 507.7 C 477.1 495.7 459.9 486.6 445.9 489M 394.9 705.6 C 391.4 714.1 393.8 726 399.7 729.8 C 401.6 731 402 730.9 403.1 728.8 C 405.5 724.6 404.8 715.1 401.8 709.9 C 397.8 703 396.3 702.1 394.9 705.6M 352.2 719 C 349.3 720.2 349.4 721.1 352.8 724.3 C 358.5 729.8 368.3 731.6 375.7 728.5 L 379.4 726.9 376.5 724.3 C 370.1 718.7 359 716.3 352.2 719M 374.2 740 C 369 742.4 369.4 743.5 376.5 745.5 C 382 747.1 385.3 746.8 390.2 744.3 C 399 739.9 383.5 735.8 374.2 740M 525.2 756.6 C 519.1 759.6 515.7 763.7 514 769.9 C 512.5 775.6 513.6 776.6 518.8 774.4 C 525.3 771.9 530.4 765.2 532.4 756.8 C 533.2 753.2 532 753.2 525.2 756.6M 499.6 759.1 C 496.3 764.2 494.8 769.3 495.4 773.4 C 496.3 779.2 497.4 780.7 499.4 779.1 C 500.3 778.3 501 778.1 501 778.6 C 501.1 779.1 501.9 777.9 503 776 C 505.2 772 505.5 766.8 503.9 761.9 C 502.2 757 501.4 756.5 499.6 759.1M 513.4 786.1 C 511.7 786.6 509.6 787.8 508.6 788.8 C 504.2 793.7 519.8 797 528.6 793.1 L 533.5 790.9 531.1 789 C 526.3 785.4 519.6 784.3 513.4 786.1"
  };
  function seedArt() {
    var layer = function (cls, inner) { return '<svg class="sa-layer ' + cls + '" viewBox="0 0 896 1120" aria-hidden="true">' + inner + "</svg>"; };
    return '<div class="seed-art" role="img" aria-label="' + esc(t("sust.seed_alt")) + '">' +
      layer("sa-ground", '<symbol id="sa-scene" viewBox="0 0 896 1120"><path fill-rule="evenodd" d="' + SEED_SVG.scene + '"/></symbol><use href="#sa-scene"/>') +
      layer("sa-tree", '<use href="#sa-scene"/>') +
      // Samen = der Teil der Hand-Zeichnung unter den Fingerspitzen; beim Fallen deckt ein weißes Feld ihn in der Hand ab
      layer("sa-handl", '<path id="sa-hand-p" fill-rule="evenodd" d="' + SEED_SVG.hand + '"/><rect class="sa-cover" x="452" y="369" width="34" height="37" fill="#fff"/>') +
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
    var green = D.items.filter(function (i) { return i.type === "projet" && txt(i.description).join(" ").indexOf("Green Challenge") > -1; });
    main.innerHTML = pageHead(D.site.entetes.durabilite, t("nav.sustainability")) +
      '<section class="section"><div class="wrap wrap--narrow"><p class="lead">' + esc(t("sust.vision")) + "</p></div></section>" +
      '<section class="section section--off"><div class="wrap"><div class="split">' +
      seedArt() +
      '<div><span class="eyebrow">' + esc(t("sust.gc_eyebrow")) + '</span><h2 class="h-section">' + esc(t("sust.gc_title")) + "</h2>" +
      '<p class="lead" style="margin-top:24px">' + esc(t("sust.gc_text")) + "</p></div></div></div></section>" +
      '<section class="section"><div class="wrap"><h2 class="h-section" style="margin-bottom:32px">' + esc(t("sust.principles_title")) + '</h2><ul class="principles">' +
      ["p1", "p2", "p3", "p4"].map(function (k, i) { return '<li><span class="service__num">0' + (i + 1) + "</span><strong>" + esc(t("sust." + k)) + "</strong></li>"; }).join("") +
      "</ul></div></section>" +
      '<section class="section"><div class="wrap"><h2 class="h-section" style="margin-bottom:40px">' + esc(t("sust.projects_title")) + '</h2><div class="grid">' + green.map(card).join("") + "</div></div></section>" +
      ctaBand();
    initSeedArt(main);
  };

  pages.about = function (main) {
    var p = function (id, n) { return (byId(id) || { images: [] }).images[n || 0]; };
    // Über uns: Kopf wie alte About-Seite, dann das Team, darunter der Rest der Seite
    main.innerHTML = titleHead(t("nav.about"), t("about.h1")) + teamSection() +
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
    main.innerHTML = pageHead(D.site.entetes.team, t("nav.team")) + intro(t("team.lead")) + teamSection() + ctaBand();
  };

  // Seitenanfang ohne Foto, nur der Titel (wie beim Datenschutz)
  function titleHead(text, lead) { return '<div class="wrap page-title"><h1 class="h-display">' + esc(text) + "</h1>" + (lead ? '<p class="lead">' + esc(lead) + "</p>" : "") + "</div>"; }

  /* Datenschutzerklärung (Text der alten Seite, legal.js) – nur auf Englisch vorhanden */
  pages.datenschutz = function (main) {
    var L = (window.DRP_LEGAL || {}).privacy || {};
    // ohne Kopfbild, Text über die ganze Breite
    main.innerHTML = titleHead(t("footer.privacy")) + '<div class="wrap legal">' +
      (lang !== "en" ? '<p class="legal__note" lang="' + lang + '">' + esc(t("legal.only_en")) + "</p>" : "") +
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
      "<li><span>" + esc(t("contact.address")) + "</span><span>" + esc(s.societe) + "<br>" + s.adresse.map(esc).join("<br>") + "<br><small class=\"muted\">(" + esc(s.adresse_note) + ")</small></span></li>" +
      "<li><span>" + esc(t("contact.phone")) + "</span><span>" + s.telephones.map(function (p) { return '<a href="' + p.href + '">' + esc(p.label) + "</a>"; }).join("<br>") + "</span></li>" +
      "<li><span>" + esc(t("contact.email")) + '</span><span><a href="mailto:' + s.email + '">' + esc(s.email) + "</a></span></li></ul>" +
      '<div class="mini-map" id="mini-map" role="img" aria-label="Gonderange"></div><p class="map-note">' + esc(t("common.approx")) + "</p></div>" +
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
      map.setView([s.lat, s.lng], 13);
      L.marker([s.lat, s.lng], { icon: markerIcon(L, [{ type: "projet", statut: "" }]), title: "DRP Group", alt: "DRP Group" }).addTo(map);
    });
  };

  pages.estimation = function (main) {
    var communes = uniq(D.items.map(function (i) { return i.localite; }));
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
    var link = '<a href="' + D.site.confidentialite + '" target="_blank" rel="noopener">' + esc(t("form.privacy_link")) + "</a>";
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
