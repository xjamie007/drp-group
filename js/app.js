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
  function setLang(l) {
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

  /* Fehlende Bilddatei → Platzhalter, damit das Layout steht */
  document.addEventListener("error", function (e) {
    var el = e.target;
    if (el.tagName === "IMG" && el.parentNode && el.parentNode.classList.contains("ratio")) el.outerHTML = ph();
    if (el.tagName === "IMG" && el.closest(".hero__media")) el.style.visibility = "hidden";
  }, true);

  /* ------------------------------------------------------------ icons */
  var ICON = {
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
    var subs = D.bereiche.map(function (b) { return '<li><a href="' + b.page + '">' + esc(b.nom) + "</a></li>"; }).join("") +
      '<li><a href="services.html"' + current("services") + ">" + esc(t("nav.services")) + "</a></li>";
    $("#header").innerHTML =
      '<header class="site-header"><div class="wrap">' +
      '<a class="logo" href="index.html"><img src="assets/logo-drp-group.png" width="77" height="46" alt="' + esc(t("common.logo_alt")) + '"></a>' +
      '<nav class="nav" aria-label="Main"><ul>' +
      '<li class="has-sub"><button type="button" class="nav-toggle" aria-expanded="false" aria-controls="sub-activities">' + esc(t("nav.activities")) + ' ▾</button>' +
      '<ul class="sub" id="sub-activities">' + subs + "</ul></li>" +
      NAV.map(function (n) { return '<li><a href="' + n[1] + '"' + current(n[0]) + ">" + esc(t(n[2])) + "</a></li>"; }).join("") +
      "</ul></nav>" +
      '<div class="header-actions">' + langMenu() +
      (IS_OBJ ? "" : '<a class="btn" href="estimation.html">' + esc(t("nav.cta")) + "</a>") +
      '<button type="button" class="menu-btn" aria-expanded="false" aria-controls="mobile-menu">' + esc(t("common.menu")) + '<span class="bars" aria-hidden="true"></span></button>' +
      "</div></div></header>" +
      '<div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="' + esc(t("common.menu")) + '">' +
      '<div class="mobile-menu__top"><a class="logo" href="index.html"><img src="assets/logo-drp-group.png" width="77" height="46" alt="' + esc(t("common.logo_alt")) + '"></a>' +
      '<button type="button" class="menu-btn" data-close>' + esc(t("common.close")) + "</button></div>" +
      '<nav aria-label="Mobile"><ul>' +
      NAV.map(function (n) { return '<li><a href="' + n[1] + '"' + current(n[0]) + ">" + esc(t(n[2])) + "</a></li>"; }).join("") +
      '<li><a href="team.html"' + current("team") + ">" + esc(t("nav.team")) + "</a></li></ul>" +
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
      '<li><a href="services.html">' + esc(t("nav.services")) + '</a></li><li><a href="team.html">' + esc(t("nav.team")) + '</a></li><li><a href="estimation.html">' + esc(t("nav.cta")) + "</a></li></ul></div>" +
      "<div><h2>" + esc(t("footer.follow")) + '</h2><div class="social">' +
      '<a href="' + s.linkedin + '" target="_blank" rel="noopener" aria-label="LinkedIn (' + esc(t("common.opens_new")) + ')">' + ICON.linkedin + "</a>" +
      '<a href="' + s.instagram + '" target="_blank" rel="noopener" aria-label="Instagram (' + esc(t("common.opens_new")) + ')">' + ICON.instagram + "</a></div>" +
      '<h2 style="margin-top:32px">' + esc(t("common.language")) + "</h2>" + langSwitch() + "</div>" +
      "</div>" +
      '<div class="footer-bottom"><span>© ' + year + " " + esc(s.societe) + ". " + esc(t("footer.rights")) + "</span>" +
      '<a href="' + s.confidentialite + '" target="_blank" rel="noopener">' + esc(t("footer.privacy")) + "</a>" +
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
    return '<section class="page-head"><div class="page-head__img">' + (src ? '<img src="' + esc(src) + '" alt="" fetchpriority="high">' : ph()) + "</div>" +
      '<div class="page-head__box"><img class="page-head__logo" src="assets/logo-drp-group.png" width="120" height="72" alt="">' +
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
        '<span class="fpc__arrow">' + ARROW + "</span></div></a>", dir);
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
      html += intro(t("re.intro")) + servicesSection(services("re", 3)) +
        '<section class="section section--off"><div class="wrap"><div class="split">' +
        '<div><span class="eyebrow">' + esc(t("page.before_after")) + '</span><h2 class="h-section">' + esc(t("re.s1_t")) + "</h2><p class=\"muted\" style=\"margin-top:16px\">" + esc(t("re.ba_text")) + "</p></div>" +
        beforeAfter(D.avant_apres[0]) + "</div></div></section>";
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
      (a.film ? '<div class="arch-film-v"><video muted loop playsinline preload="none" poster="' + esc(a.film.poster) + '" aria-label="' + esc(t("arch.film_label")) + '">' +
        '<source src="' + esc(a.film.webm) + '" type="video/webm"><source src="' + esc(a.film.mp4) + '" type="video/mp4"></video>' +
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
      main.innerHTML = pageHead(D.site.entetes[isB ? "biens" : "projets"], t(isB ? "nav.properties" : "nav.projects")) +
        '<div class="wrap"><div class="page-intro">' +
        '<p class="lead">' + esc(t(isB ? "list.properties_lead" : "list.projects_lead")) + "</p></div>" +
        filtersHtml(defs, st, res.length) +
        (res.length ? '<div class="grid">' + res.map(card).join("") + "</div>"
          : '<p class="empty">' + esc(t("common.none")) + ' <a href="' + location.pathname.split("/").pop() + '">' + esc(t("common.reset")) + "</a></p>") +
        '</div><div style="height:clamp(64px,10vw,140px)"></div>' + ctaBand();
      bindFilters(main, st, function (el) { draw(el); });
      refocus(focusEl);
    }
    draw();
  }
  pages.biens = function (main) { listPage(main, "bien"); };
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
        '<div class="gallery__main" style="position:relative">' + badge(it) + '<div class="ratio r-3x2" id="g-main">' +
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
      (it.brochure ? '<a class="btn btn--ghost" href="' + esc(it.brochure) + '" download>' + esc(t("detail.brochure")) + "</a>" : "") + "</div>" +
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

  pages.durabilite = function (main) {
    var green = D.items.filter(function (i) { return i.type === "projet" && txt(i.description).join(" ").indexOf("Green Challenge") > -1; });
    main.innerHTML = pageHead(D.site.entetes.durabilite, t("nav.sustainability")) +
      '<section class="section"><div class="wrap wrap--narrow"><p class="lead">' + esc(t("sust.vision")) + "</p></div></section>" +
      '<section class="section section--off"><div class="wrap"><div class="split">' +
      img((byId("trinary-reckange-mersch") || { images: [] }).images[0], "", "r-4x5") +
      '<div><span class="eyebrow">' + esc(t("sust.gc_eyebrow")) + '</span><h2 class="h-section">' + esc(t("sust.gc_title")) + "</h2>" +
      '<p class="lead" style="margin-top:24px">' + esc(t("sust.gc_text")) + "</p></div></div></div></section>" +
      '<section class="section"><div class="wrap"><h2 class="h-section" style="margin-bottom:32px">' + esc(t("sust.principles_title")) + '</h2><ul class="principles">' +
      ["p1", "p2", "p3", "p4"].map(function (k, i) { return '<li><span class="service__num">0' + (i + 1) + "</span><strong>" + esc(t("sust." + k)) + "</strong></li>"; }).join("") +
      "</ul></div></section>" +
      '<section class="section"><div class="wrap"><h2 class="h-section" style="margin-bottom:40px">' + esc(t("sust.projects_title")) + '</h2><div class="grid">' + green.map(card).join("") + "</div></div></section>" +
      ctaBand();
  };

  pages.about = function (main) {
    var p = function (id, n) { return (byId(id) || { images: [] }).images[n || 0]; };
    // Über uns: Kopf wie alte About-Seite, dann das Team, darunter der Rest der Seite
    main.innerHTML = pageHead(D.site.entetes.about, t("nav.about")) + intro(t("about.h1")) + teamSection() +
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

  pages.services = function (main) {
    main.innerHTML =
      pageHead(D.site.entetes.services, t("nav.services")) + intro(t("services.title")) +
      '<section class="section section--tight"><div class="wrap"><div class="section-head"><div><span class="eyebrow">DRP Luxembourg</span><h2 class="h-section">' + esc(t("services.agency")) + "</h2></div>" +
      '<a class="link-arrow" href="drp-luxembourg.html">DRP Luxembourg</a></div>' + services("lux", 4) + "</div></section>" +
      '<section class="section section--tight"><div class="wrap"><div class="section-head"><div><span class="eyebrow">DRP Real Estate</span><h2 class="h-section">' + esc(t("services.dev")) + "</h2></div>" +
      '<a class="link-arrow" href="drp-real-estate.html">DRP Real Estate</a></div>' + services("re", 3) + "</div></section>" +
      '<section class="section section--off"><div class="wrap"><div class="split"><div><h2 class="h-section">' + esc(t("services.q_title")) + '</h2><p class="lead" style="margin-top:20px">' + esc(t("services.q_text")) + "</p></div>" +
      '<div><div class="btn-row"><a class="btn" href="contact.html">' + esc(t("cta.secondary")) + '</a><a class="btn btn--ghost" href="estimation.html">' + esc(t("nav.cta")) + "</a></div>" + ctaNote() + "</div></div></div></section>" +
      ctaBand();
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

  pages.contact = function (main) {
    var s = D.site;
    var ref = byId(param("ref"));
    var visit = param("sujet") === "visite";
    main.innerHTML =
      pageHead(D.site.entetes.contact, t("nav.contact")) + intro(t("contact.lead")) +
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
    if (D.site.hero_image && D.site.hero_image !== "assets/hero/hero.jpg") { // im Admin ersetzt
      if (hi.getAttribute("src") !== D.site.hero_image) { hi.removeAttribute("srcset"); hi.src = D.site.hero_image; }
      $$("video", m).forEach(function (v) { v.remove(); }); m.classList.remove("has-video");
      return;
    }
    if (REDUCED || m.dataset.videoTried) return;
    m.dataset.videoTried = "1";
    if (document.readyState !== "complete") { window.addEventListener("load", function () { delete m.dataset.videoTried; initHero(); }, { once: true }); return; }
    // Video-Slot: liegt assets/hero/hero.webm oder .mp4 vor, ersetzt es das Foto.
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
    v.setAttribute("aria-hidden", "true"); // kein Poster: das Foto liegt darunter, bis das Video läuft
    [[D.site.hero_video_webm, "video/webm"], [D.site.hero_video_mp4, "video/mp4"]].forEach(function (s) {
      var src = document.createElement("source"); src.src = s[0]; src.type = s[1]; v.appendChild(src);
    });
    v.addEventListener("playing", function () { m.classList.add("has-video"); });
    $$("source", v).pop().addEventListener("error", function () { v.remove(); });
    m.appendChild(v);
  }

  /* ------------------------------------------------------------ render */
  function render() {
    D = window.DRP_DATA; I = window.DRP_I18N;
    cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    cleanups = [];
    document.documentElement.lang = lang;
    var metaKey = { home: "home", biens: "properties", bien: "properties", projets: "projects", projet: "projects", carte: "map", durabilite: "sustainability",
      estimation: "valuation", about: "about", team: "team", membre: "team", contact: "contact", services: "services", notfound: "notfound", bereich: "home" }[PAGE];
    document.title = t("meta." + metaKey);
    $(".skip-link").textContent = t("common.skip");
    header();
    initHero();
    var main = $("#main");
    main.innerHTML = "";
    $$("[data-lang]").forEach(function (b) { b.addEventListener("click", function () { setLang(b.dataset.lang); }); });
    function fill() {
      // im Admin gelöschte Seite: Besucher sehen „nicht gefunden“, der Admin sieht sie weiter (zum Wiederherstellen)
      var pg = !window.DRP_EDIT && isHidden(location.pathname) ? "notfound" : PAGE;
      if (pages[pg]) pages[pg](main);
      footer(); pruneLinks(); reveal(main); APP.rendered(main);
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
