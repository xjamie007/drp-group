/*
 * DRP Group – Prototyp, Datendatei
 * ----------------------------------------------------------------------------
 * EINZIGE Quelle für Biens, Projekte, Team und Bereichs-Fotos. Karte, Slider
 * „À l’affiche“, Listen und Detailseiten lesen alles von hier.
 *
 * Die Feldnamen von `items` entsprechen 1:1 den späteren WordPress-Feldern
 * (Phase 2, ACF / Uncode-Portfolio):
 *   type            'bien' | 'projet'
 *   bereich         'luxembourg' | 'real-estate' | 'senses' | 'architecture'
 *   statut          'a-vendre' | 'a-louer' | 'vendu' | 'loue' | 'en-cours' | 'realise'
 *   prix            Zahl in EUR (bei 'a-louer' = Monatsmiete), null = nicht angegeben
 *   prix_tva3       true = Preis inkl. 3 % TVA (super-reduzierter Satz)
 *   surface         Zahl in m² · surface_texte: Spanne als Text (Projekte)
 *   chambres        Text („3“, „1–4“)
 *   gemeinde        Gemeinde · localite: Ortschaft/Quartier, wie auf der Seite genannt
 *   adresse         null = unbekannt. NIE raten.
 *   adresse_exacte  false = lat/lng ist die Ortsmitte (Nominatim), nicht das Gebäude
 *   a_laffiche      true = erscheint im Slider „À l’affiche“ (max. 3, Reihenfolge = hier)
 *   video           Pfad zu MP4 (muted loop) oder null → dann erstes Foto
 *   video_poster    Standbild = erster Frame des Videos (kein Sprung beim Start)
 *   avant / apres   Bildpfade für den Vorher/Nachher-Slider oder null
 *   images          Bildpfade; das erste ist das Titelbild. Fehlt eines → Platzhalter.
 *   description     { en: [...Absätze] } – fr/de/lb folgen über Polylang
 *   ancienne_url    heutige URL auf drp-group.lu (bleibt in Phase 2 erhalten)
 *
 * Bereiche: `hero` = Kopfbild der Bereichsseite. Auf der Startseite erscheinen sie als Boxen ohne Foto.
 *
 * Seitenköpfe (`site.entetes`): Kopfbild je Seite, wie auf der alten Website (about, services, biens/projets,
 *   team, contact = Originalfotos der alten Seiten).
 * Team: Reihenfolge und Gruppen (`groupe`: associes | equipe) wie auf der alten Team-Seite.
 *   `url` = Link der alten Seite (/team/<id>/ → membre.html?id=<id>, sonst extern).
 *
 * Fotos austauschen: Datei in assets/img/... ersetzen (gleicher Name) oder Pfad
 * hier ändern. Alle Bildrahmen haben feste Seitenverhältnisse, das Layout
 * verschiebt sich nicht.
 * Quelle der Inhalte: drp-group.lu, Stand 07.10.2026. Nichts ergänzt.
 */
window.DRP_DATA = {
  site: {
  "nom": "DRP Group",
  "societe": "DRP Group sàrl",
  "adresse": [
    "17, route de Luxembourg",
    "L-6182 Gonderange",
    "Luxembourg"
  ],
  "adresse_note": "former 'rue de l'école'",
  "lat": 49.69266,
  "lng": 6.24435,
  "telephones": [
    {
      "label": "+352 26 78 15 22",
      "href": "tel:+35226781522"
    },
    {
      "label": "+352 621 743 665",
      "href": "tel:+352621743665"
    }
  ],
  "email": "info@drp-group.lu",
  "linkedin": "https://www.linkedin.com/company/drp-group-s%C3%A0rl/",
  "instagram": "https://www.instagram.com/drp.group",
  "confidentialite": "https://www.drp-group.lu/privacy-policy/",
  "hero_image": "assets/hero/hero.jpg",
  "entetes": {
    "about": "assets/entetes/about.jpg",
    "services": "assets/entetes/services.jpg",
    "biens": "assets/entetes/projets.jpg",
    "projets": "assets/entetes/projets.jpg",
    "team": "assets/entetes/team.jpg",
    "contact": "assets/entetes/contact.jpg",
    "carte": "assets/img/residence-obelix-kehlen/03.jpg",
    "durabilite": "assets/img/buy-penthouse-08-residence-xxc-steinsel/05.jpg",
    "estimation": "assets/img/for-sale-house-in-lintgen/01.jpg"
  },
  "hero_video_mp4": "assets/hero/hero.mp4",
  "hero_video_webm": "assets/hero/hero.webm",
  "citation": {
    "texte": "Quality isn’t expensive, it’s priceless.",
    "auteur": "William Walsh"
  },
  "arbres_plantes": null
},

  bereiche: [
  {
    "id": "luxembourg",
    "nom": "DRP Luxembourg",
    "page": "drp-luxembourg.html",
    "hero": "assets/img/for-sale-house-in-waldbredimus-2/01.jpg",
    "contact": "marc-schuman",
    "liste": {
      "type": "bien",
      "bereich": "luxembourg"
    }
  },
  {
    "id": "real-estate",
    "nom": "DRP Real Estate",
    "page": "drp-real-estate.html",
    "hero": "assets/img/buy-penthouse-08-residence-xxc-steinsel/02.jpg",
    "contact": "philippe-rausch",
    "liste": {
      "type": "projet",
      "bereich": "real-estate"
    }
  },
  {
    "id": "senses",
    "nom": "DRP Senses",
    "page": "drp-senses.html",
    "hero": null,
    "contact": null,
    "liste": null
  },
  {
    "id": "architecture",
    "nom": "DRP Architecture",
    "page": "drp-architecture.html",
    "hero": "assets/img/trinary-reckange-mersch/01.jpg",
    "contact": "david-rausch",
    "liste": null,
    "site": "https://www.drp-architecture.lu"
  }
],

  /* DRP Architecture: alle Fotos von drp-architecture.lu (Galerie-Seite, Startseite, Mediathek), ohne Planzeichnungen
     und Stockfotos. Abgerufen am 08.10.2026. ratio = Breite/Höhe, damit die Bildwand nichts beschneidet. */
  architecture: {
  "source": "https://www.drp-architecture.lu",
  "film": { "mp4": "assets/architecture/film/drp-architecture.mp4", "webm": "assets/architecture/film/drp-architecture.webm", "poster": "assets/architecture/film/drp-architecture.jpg" },
  "photos": [
    {
      "image": "assets/architecture/galerie/01.jpg",
      "ratio": 1.778
    },
    {
      "image": "assets/architecture/galerie/02.jpg",
      "ratio": 1.778
    },
    {
      "image": "assets/architecture/galerie/03.jpg",
      "ratio": 1.778
    },
    {
      "image": "assets/architecture/galerie/04.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/05.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/06.jpg",
      "ratio": 1.751
    },
    {
      "image": "assets/architecture/galerie/07.jpg",
      "ratio": 0.796
    },
    {
      "image": "assets/architecture/galerie/08.jpg",
      "ratio": 0.644
    },
    {
      "image": "assets/architecture/galerie/09.jpg",
      "ratio": 1.751
    },
    {
      "image": "assets/architecture/galerie/10.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/11.jpg",
      "ratio": 1.522
    },
    {
      "image": "assets/architecture/galerie/12.jpg",
      "ratio": 2.273
    },
    {
      "image": "assets/architecture/galerie/13.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/14.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/15.jpg",
      "ratio": 2.165
    },
    {
      "image": "assets/architecture/galerie/16.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/17.jpg",
      "ratio": 1.778
    },
    {
      "image": "assets/architecture/galerie/18.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/19.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/20.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/21.jpg",
      "ratio": 1.719
    },
    {
      "image": "assets/architecture/galerie/22.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/23.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/24.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/25.jpg",
      "ratio": 1.504
    },
    {
      "image": "assets/architecture/galerie/26.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/27.jpg",
      "ratio": 1.667
    },
    {
      "image": "assets/architecture/galerie/28.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/29.jpg",
      "ratio": 0.75
    },
    {
      "image": "assets/architecture/galerie/30.jpg",
      "ratio": 1.504
    },
    {
      "image": "assets/architecture/galerie/31.jpg",
      "ratio": 0.667
    },
    {
      "image": "assets/architecture/galerie/32.jpg",
      "ratio": 1.326
    },
    {
      "image": "assets/architecture/galerie/33.jpg",
      "ratio": 1.536
    },
    {
      "image": "assets/architecture/galerie/34.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/35.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/36.jpg",
      "ratio": 1.501
    },
    {
      "image": "assets/architecture/galerie/37.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/38.jpg",
      "ratio": 1.5
    },
    {
      "image": "assets/architecture/galerie/39.jpg",
      "ratio": 1.667
    },
    {
      "image": "assets/architecture/galerie/40.jpg",
      "ratio": 0.75
    },
    {
      "image": "assets/architecture/galerie/41.jpg",
      "ratio": 1.667
    },
    {
      "image": "assets/architecture/galerie/42.jpg",
      "ratio": 2.059
    },
    {
      "image": "assets/architecture/galerie/43.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/44.jpg",
      "ratio": 1.751
    },
    {
      "image": "assets/architecture/galerie/45.jpg",
      "ratio": 1.5
    },
    {
      "image": "assets/architecture/galerie/46.jpg",
      "ratio": 1.5
    },
    {
      "image": "assets/architecture/galerie/47.jpg",
      "ratio": 1.504
    },
    {
      "image": "assets/architecture/galerie/48.jpg",
      "ratio": 0.667
    },
    {
      "image": "assets/architecture/galerie/49.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/50.jpg",
      "ratio": 1.505
    },
    {
      "image": "assets/architecture/galerie/51.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/52.jpg",
      "ratio": 1.473
    },
    {
      "image": "assets/architecture/galerie/53.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/54.jpg",
      "ratio": 1.504
    },
    {
      "image": "assets/architecture/galerie/55.jpg",
      "ratio": 1.501
    },
    {
      "image": "assets/architecture/galerie/56.jpg",
      "ratio": 1.501
    },
    {
      "image": "assets/architecture/galerie/57.jpg",
      "ratio": 1.501
    },
    {
      "image": "assets/architecture/galerie/58.jpg",
      "ratio": 1.501
    },
    {
      "image": "assets/architecture/galerie/59.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/60.jpg",
      "ratio": 1.501
    },
    {
      "image": "assets/architecture/galerie/61.jpg",
      "ratio": 1.778
    },
    {
      "image": "assets/architecture/galerie/62.jpg",
      "ratio": 0.75
    },
    {
      "image": "assets/architecture/galerie/63.jpg",
      "ratio": 1.778
    },
    {
      "image": "assets/architecture/galerie/64.jpg",
      "ratio": 0.562
    },
    {
      "image": "assets/architecture/galerie/65.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/66.jpg",
      "ratio": 1.498
    },
    {
      "image": "assets/architecture/galerie/67.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/68.jpg",
      "ratio": 1.5
    },
    {
      "image": "assets/architecture/galerie/69.jpg",
      "ratio": 1.504
    },
    {
      "image": "assets/architecture/galerie/70.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/71.jpg",
      "ratio": 0.667
    },
    {
      "image": "assets/architecture/galerie/72.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/73.jpg",
      "ratio": 1.5
    },
    {
      "image": "assets/architecture/galerie/74.jpg",
      "ratio": 0.666
    },
    {
      "image": "assets/architecture/galerie/75.jpg",
      "ratio": 1.509
    },
    {
      "image": "assets/architecture/galerie/76.jpg",
      "ratio": 1.504
    },
    {
      "image": "assets/architecture/galerie/77.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/78.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/79.jpg",
      "ratio": 1.502
    },
    {
      "image": "assets/architecture/galerie/80.jpg",
      "ratio": 1.501
    }
  ]
},

  /* Vorher/Nachher (DRP Real Estate). Noch keine Fotos vorhanden → Platzhalter. */
  avant_apres: [
  {
    "titre": null,
    "avant": null,
    "apres": null,
    "projet": null
  }
],

  items: [
  {
    "id": "residence-obelix-kehlen",
    "type": "projet",
    "bereich": "real-estate",
    "categorie": "residence",
    "statut": "en-cours",
    "titre": "Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": null,
    "prix_tva3": false,
    "surface": null,
    "surface_texte": null,
    "chambres": "1–4",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": 6,
    "vente": null,
    "unites": [
      "Apartment 01: up to 4 bedrooms",
      "Apartment 02: 3 bedrooms",
      "Apartment 03: 1 bedroom",
      "Apartment 04: 2 bedrooms (+ office space)",
      "Apartment 05: 2 bedrooms",
      "Penthouse 06: 3 bedrooms"
    ],
    "projet": null,
    "a_laffiche": true,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/residence-obelix-kehlen/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "One unit is fully compliant with accessibility criteria (PMR), ensuring inclusivity and comfort for all residents.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": null
  },
  {
    "id": "residences-blanchy-rene-bascharage",
    "type": "projet",
    "bereich": "real-estate",
    "categorie": "residence",
    "statut": "en-cours",
    "titre": "Residences Blanchy & René – Bascharage",
    "localite": "Bascharage",
    "gemeinde": "Käerjeng",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.57127,
    "lng": 5.91284,
    "prix": null,
    "prix_tva3": false,
    "surface": null,
    "surface_texte": null,
    "chambres": "3–5",
    "annee": null,
    "disponibilite": "2027",
    "energie": null,
    "unites_total": 6,
    "vente": "5/6",
    "unites": [
      "Apartment B – 01: 3 bedrooms",
      "Apartment B – 02: 5 bedrooms",
      "Penthouse B – 03: 3 bedrooms",
      "Apartment R – 01: 4 bedrooms",
      "Apartment R – 02: 3 bedrooms",
      "Penthouse R – 03: 3 bedrooms"
    ],
    "projet": null,
    "a_laffiche": true,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/01.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/02.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/03.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/04.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/05.jpg",
      "assets/img/residences-blanchy-rene-bascharage/01.jpg",
      "assets/img/residences-blanchy-rene-bascharage/02.jpg",
      "assets/img/residences-blanchy-rene-bascharage/03.jpg",
      "assets/img/residences-blanchy-rene-bascharage/04.jpg",
      "assets/img/residences-blanchy-rene-bascharage/05.jpg"
    ],
    "description": {
      "en": [
        "5/6 units sold",
        "DRP Luxembourg is proud to present the Résidences ‘Blanchy & René’, a residential complex of 6 flats with a shared basement.",
        "Located in the heart of Bascharage, close to all amenities and in a quiet residential area, the project will appeal to you with its spacious units and multiple layout options. Facing south-west, the flats are flooded with natural light. All units offer between 1 and 3 balconies or terraces, and those on the ground floor also have a large private garden.",
        "Prices include a basement parking space, a cellar and a private storage room. It is possible to purchase a second space inside.",
        "Why choose ‘Blanchy et René’ ?",
        "Ideal location: Located in the heart of Bascharage, in a peaceful neighbourhood yet close to all the amenities you need. Enjoy the best of both worlds: tranquillity and accessibility.",
        "Natural light: Each flat faces south-west, flooding your living spaces with natural light throughout the day. Let yourself be seduced by bright, welcoming interiors.",
        "Exceptional Outdoor Spaces: With 1 to 3 balconies or terraces per flat, as well as spacious private gardens for the ground floor units, you’ll have plenty of space to relax and enjoy the outdoors.",
        "Premium Amenities: Our spacious units offer the flexibility to personalise your living space to suit your tastes.",
        "Amenities Included: The price includes a secure indoor parking space, a cellar, and a private storage room for all your storage needs. What’s more, the option of buying a second parking space gives you even more flexibility.",
        "Don’t miss this unique opportunity to live in a modern, refined setting, where every detail has been thought of for your comfort and well-being.",
        "We look forward to welcoming you to our offices in Gonderange, where we can present the project to you in detail."
      ]
    },
    "ancienne_url": "/portfolio/residences-blanchy-rene-bascharage/"
  },
  {
    "id": "residence-alice-wintrange",
    "type": "projet",
    "bereich": "real-estate",
    "categorie": "residence",
    "statut": "realise",
    "titre": "Residence Alice – Wintrange",
    "localite": "Wintrange",
    "gemeinde": "Schengen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.50145,
    "lng": 6.35127,
    "prix": null,
    "prix_tva3": false,
    "surface": null,
    "surface_texte": null,
    "chambres": "3–4",
    "annee": "2025",
    "disponibilite": null,
    "energie": null,
    "unites_total": 3,
    "vente": "2/3",
    "unites": [
      "Apartment 01: 3 bedrooms",
      "Apartment 02: 3 bedrooms",
      "Penthouse 03: 4 bedrooms"
    ],
    "projet": null,
    "a_laffiche": true,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-alice-wintrange/01.jpg",
      "assets/img/residence-alice-wintrange/02.jpg",
      "assets/img/residence-alice-wintrange/03.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/05.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/08.jpg",
      "assets/img/residence-alice-wintrange/04.jpg",
      "assets/img/residence-alice-wintrange/05.jpg",
      "assets/img/residence-alice-wintrange/06.jpg",
      "assets/img/residence-alice-wintrange/07.jpg",
      "assets/img/residence-alice-wintrange/08.jpg"
    ],
    "description": {
      "en": [
        "Project : We are proud to present to you our Residence Alice consisting of 3 spacious and luxurious apartments, ranging from 3-4 bedrooms.",
        "Location : Living in the east stands for high quality of life, with a calm surrounding.",
        "The residence is within walking distance of the famous “Baggerweieren”, a perfect place to relax on hot summer days.",
        "In the Moselle region you will find the opportunity to taste fine wines and local specialties in picturesque towns and villages in the middle of the vineyards. The wine village of Schengen is a famous place in modern Europe.",
        "DRP Group is committed to its belief in the Green Challenge . A tree will be planted for every unit sold."
      ]
    },
    "ancienne_url": "/portfolio/residence-alice-wintrange/"
  },
  {
    "id": "buy-penthouse-08-residence-xxc-steinsel",
    "type": "projet",
    "bereich": "real-estate",
    "categorie": "residence",
    "statut": "vendu",
    "titre": "Residence XXC – Steinsel",
    "localite": "Steinsel",
    "gemeinde": "Steinsel",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.67747,
    "lng": 6.12447,
    "prix": null,
    "prix_tva3": false,
    "surface": null,
    "surface_texte": null,
    "chambres": "1–3",
    "annee": "Q1 2026",
    "disponibilite": null,
    "energie": null,
    "unites_total": 8,
    "vente": null,
    "unites": [
      "Apartment 01: 2 bedrooms",
      "Apartment 02: 1 bedroom",
      "Apartment 03: 3 bedrooms",
      "Apartment 04: 1 bedroom",
      "Apartment 05: 2 bedrooms",
      "Apartment 06: 2 bedrooms",
      "Penthouse 07: 1 bedroom",
      "Penthouse 08: 3 bedrooms"
    ],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/01.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/02.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/03.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/04.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/05.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/06.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/07.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/08.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/09.jpg",
      "assets/img/buy-penthouse-08-residence-xxc-steinsel/10.jpg"
    ],
    "description": {
      "en": [
        "Project : We are proud to present to you our residence XXC consisting of 8 spacious and luxurious apartments, ranging from 1-3 bedrooms. Dive into a new project where nature meets luxury. This harmony will guarantee a feeling of well-being to its owners. On top of that, the project offers 10 private underground parking spots as well as 6 spots outside for communal use (only for residents and visitors).",
        "Location : Steinsel is a residential village only a few kilometers away from Luxembourg city centre. The project is perfectly located for its future residents, offering a balance of privacy and access to the commune’s infrastructure and services. Its charming character and easy accessibility to all facilities make Steinsel the perfect place to live in: supermarkets, medical centres, pharmacies, schools, sports centres and much more are only a few steps away.",
        "DRP Group is committed to its belief in the Green Challenge , that nature can and should be integrated in real estate developments. Greenery on all the terraces and balconies seem to take over the project, thus erasing the separation between the building and the garden."
      ]
    },
    "ancienne_url": "/portfolio/buy-penthouse-08-residence-xxc-steinsel/"
  },
  {
    "id": "penthouse-04-residence-solis-steinsel",
    "type": "projet",
    "bereich": "real-estate",
    "categorie": "residence",
    "statut": "vendu",
    "titre": "Residence SOLIS – Steinsel",
    "localite": "Steinsel",
    "gemeinde": "Steinsel",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.67747,
    "lng": 6.12447,
    "prix": null,
    "prix_tva3": false,
    "surface": null,
    "surface_texte": null,
    "chambres": "2–3",
    "annee": "Q1 2026",
    "disponibilite": null,
    "energie": null,
    "unites_total": 4,
    "vente": null,
    "unites": [
      "Apartment 01: 2 bedrooms",
      "Apartment 02: 2 bedrooms",
      "Apartment 03: 3 bedrooms",
      "Penthouse 04: 3 bedrooms"
    ],
    "projet": null,
    "a_laffiche": false,
    "video": "assets/video/residence-solis-steinsel.mp4",
    "video_poster": "assets/video/residence-solis-steinsel.jpg",
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/penthouse-04-residence-solis-steinsel/01.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/02.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/03.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/04.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/05.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/06.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/07.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/08.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/09.jpg",
      "assets/img/penthouse-04-residence-solis-steinsel/10.jpg"
    ],
    "description": {
      "en": [
        "Project : Residence “SOLIS” in Steinsel",
        "DRP Group is proud to present the residence SOLIS real estate project, composed of 4 modern and bright apartments, ranging from 2 to 3 bedrooms.",
        "The harmonious residence is located in ‘rue de l’école’ in Steinsel, a quiet residential area, a few minutes walk from the center of the town, and the school complex.",
        "Each apartment has a terrace with garden, and/or a balcony.",
        "A quality bicycle shelter will be available to the co-ownership.",
        "Location : Steinsel is a residential village a few kilometers from downtown Luxembourg. The town has around 6,000 inhabitants, who benefit from several premises, including three primary schools (the fourth will soon be completed), a music school, a Foyer-Kinderhouse, and a selection of supermarkets, medical centers , pharmacies, sports centers – all just a few steps from the new Residence SOLIS. The new urban center of Steinsel is also nearing completion. Steinsel is proud of its numerous green spaces, its breathtaking forests and trails, and the famous and valuable PIDAL complex, which offers a wellness opportunity to all residents with its swimming pool, sauna, restaurants , its fitness and its spa."
      ]
    },
    "ancienne_url": "/portfolio/penthouse-04-residence-solis-steinsel/"
  },
  {
    "id": "trinary-reckange-mersch",
    "type": "projet",
    "bereich": "real-estate",
    "categorie": "maisons",
    "statut": "realise",
    "titre": "Trinary – Reckange, Mersch",
    "localite": "Reckange",
    "gemeinde": "Mersch",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.74893,
    "lng": 6.08107,
    "prix": null,
    "prix_tva3": false,
    "surface": null,
    "surface_texte": "200–280",
    "chambres": "3–4",
    "annee": "2025",
    "disponibilite": null,
    "energie": null,
    "unites_total": 3,
    "vente": "2/3",
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/trinary-reckange-mersch/01.jpg"
    ],
    "description": {
      "en": [
        "Location : Reckange is a residential suburb only a kilometer away from „the northern capital“ Mersch. The project is ideally located for its future residents, offering a balance of privacy and access to the commune’s facilities and services. Whether you arrive on foot, by bike, by car or by train, the municipality of Mersch, located in the geographical centre of Luxembourg, welcomes its visitors with a variety of attractions in culture, nature, sports and tourism. The commune offers a range of historical sites and entertainment, from historical medieval monuments to the National Literature Centre (CNL), as well as the town’s water and entertainment areas, such as the aqua centre Krounebierg, which offers swimming and bathing fun for the whole family, providing recreation and leisure.",
        "Project : The challenge was to incorporate 3 single houses, each with a terrace and a garden, in a plot longer than it is wide, using natural light in the most efficient way, respecting sustainability criteria, and ensuring optimal comfort for future homeowners.",
        "We were able to optimize the available surfaces, to create three houses each up to 15 m deep and 4 floors up. For the alignment of the houses, each unit is shifted backwards. This ensures that they all get the most possible sun exposure and the block effect is reduced. The orientation of the project is South-West facing.",
        "DRP Group stands behind their belief of the Green Challenge , that nature can and should be integrated in real estate developments. Greenery on all the terraces seem to take over the project. Thus the strict separation between the building and the garden is erased."
      ]
    },
    "ancienne_url": "/portfolio/trinary-reckange-mersch/"
  },
  {
    "id": "apartment-01-residence-obelix-kehlen",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment 01 – Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": 1250000,
    "prix_tva3": true,
    "surface": 161.5,
    "surface_texte": null,
    "chambres": "3–4",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-obelix-kehlen",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/01.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/02.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/03.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/05.jpg",
      "assets/img/residence-obelix-kehlen/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Apartment 01 is fully compliant with accessibility criteria (PMR), ensuring inclusivity and comfort for its residents.",
        "Apartment 01:",
        "– Configuration up to 4 bedrooms",
        "– Floor: ground floor",
        "– Living area : 140,10 m2",
        "– Terrace of 65 m²",
        "– Garden of 100 m²",
        "Apartment 01 will charm you with its functionality as well as its elegance. With a breathtaking view from the entrance guiding you through to the heart of the home. A spacious living area welcomes a large table that can accommodate up to 10 people, creating a natural separation between the open kitchen and the living room. Each space fully benefits from the view of the garden, extending far beyond towards the rolling hills of the west of the country.",
        "The apartment can easily accommodate three PMR-compliant bedrooms, with the possibility of converting the dressing room into an office or an additional bedroom to create a fourth bedroom. Designed according to PMR standards, it offers generous spaces and particularly comfortable areas, with hallways and doors wider than average.",
        "Outside, residents enjoy a large terrace directly connected to the open plan kitchen and living room, as well as a more intimate outdoor space adjoining the master suite. A private garden, along with access to the garden located at the front of the residence, completes this exceptional unit.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "One unit is fully compliant with accessibility criteria (PMR), ensuring inclusivity and comfort for all residents.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": "/portfolio/apartment-01-residence-obelix-kehlen/"
  },
  {
    "id": "apartment-02-residence-obelix-kehlen",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment 02 – Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": 1126500,
    "prix_tva3": true,
    "surface": 123.27,
    "surface_texte": null,
    "chambres": "3",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-obelix-kehlen",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-02-residence-obelix-kehlen/01.jpg",
      "assets/img/apartment-02-residence-obelix-kehlen/02.jpg",
      "assets/img/apartment-02-residence-obelix-kehlen/03.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/05.jpg",
      "assets/img/residence-obelix-kehlen/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Apartment 02:",
        "– 3 bedrooms",
        "– Floor: +1",
        "– Living area : 120,03 m2",
        "– Balcony : 8,10 m2",
        "Upon entry, a breathtaking view greets you and guides you into the heart of the home. Apartment 02 is intelligently arranged into two distinct parts: a cozy living space (living room, kitchen and dining areas) and a private area accommodating three bedrooms along with two bathrooms. The living space extends to the outside with a large balcony south-west facing.",
        "The master suite is the true highlight of this apartment. Occupants wake up each morning to an exceptional view and enjoy generous spaces, with the possibility of creating a custom dressing room or a workspace. A spacious ensuite bathroom completes this space. The two other bedrooms benefit from the sunrise with a common bathroom.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "One unit is fully compliant with accessibility criteria (PMR), ensuring inclusivity and comfort for all residents.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": "/portfolio/apartment-02-residence-obelix-kehlen/"
  },
  {
    "id": "apartment-03-residence-obelix-kehlen",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment 03 – Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": 526600,
    "prix_tva3": true,
    "surface": 50,
    "surface_texte": null,
    "chambres": "1",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-obelix-kehlen",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-03-residence-obelix-kehlen/01.jpg",
      "assets/img/apartment-03-residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Apartment 03:",
        "– 1 bedroom",
        "– Floor: +1",
        "– Living area : 47,20 m2",
        "– Balcony : 6,42 m2",
        "For a one-bedroom unit, apartment 03 provides all the necessary comfort. A balcony connected to the bedroom allows one to enjoy the sunrise in all tranquility, while a spacious bathroom ensures optimal convenience. The living space, bright and open, naturally extends outdoors with its large windows and offers an unobstructed view of the commune of Kehlen.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "One unit is fully compliant with accessibility criteria (PMR), ensuring inclusivity and comfort for all residents.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": "/portfolio/apartment-03-residence-obelix-kehlen/"
  },
  {
    "id": "apartment-04-residence-obelix-kehlen",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment 04 – Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": 826500,
    "prix_tva3": true,
    "surface": 90.16,
    "surface_texte": null,
    "chambres": "2",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-obelix-kehlen",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-04-residence-obelix-kehlen/01.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/04.jpg",
      "assets/img/residence-obelix-kehlen/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Apartment 04:",
        "– 2 bedrooms (+ office space)",
        "– Floor: +2",
        "– Living area : 88,21 m2",
        "– Balcony : 4,88 m2",
        "The entrance hall benefits from a storage space as well as a separate toilet. Upon arrival, a breathtaking view leads you to the living area, featuring a kitchen with an additional pantry and a light-filled living room.",
        "The private area offers several configurations depending on the client’s needs and preferences. One option includes two bedrooms, each with its own spacious and comfortable en-suite bathroom. For those wishing to integrate an office space, an alternative configuration is possible, while maintaining the comfort of two bathrooms.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "One unit is fully compliant with accessibility criteria (PMR), ensuring inclusivity and comfort for all residents.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": "/portfolio/apartment-04-residence-obelix-kehlen/"
  },
  {
    "id": "apartment-05-residence-obelix-kehlen",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment 05 – Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": 776500,
    "prix_tva3": true,
    "surface": 83.12,
    "surface_texte": null,
    "chambres": "2",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-obelix-kehlen",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/apartment-05-residence-obelix-kehlen/01.jpg",
      "assets/img/apartment-05-residence-obelix-kehlen/02.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/03.jpg",
      "assets/img/apartment-05-residence-obelix-kehlen/03.jpg",
      "assets/img/apartment-01-residence-obelix-kehlen/05.jpg",
      "assets/img/residence-obelix-kehlen/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Apartment 05:",
        "– 2 bedrooms",
        "– Floor: +2",
        "– Living area : 78,60 m2",
        "– 2 balconies : 11,30 m2",
        "Apartment 05 appeals with its functionality: two bedrooms, two balconies, two bathrooms, a separate toilet, a laundry/storage room, and a living room with an open kitchen, ensuring a modern use of the space. Located on the 2nd floor of the residence, with a balcony on each side giving you the possibility to savour the sun all day long.",
        "For those wishing to incorporate an office space, other configurations are feasible according to the needs and preferences of the residents.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": "/portfolio/apartment-05-residence-obelix-kehlen/"
  },
  {
    "id": "penthouse-06-residence-obelix-kehlen",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "penthouse",
    "statut": "a-vendre",
    "titre": "Penthouse 06 – Residence Obelix – Kehlen",
    "localite": "Kehlen",
    "gemeinde": "Kehlen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.66755,
    "lng": 6.03571,
    "prix": 1368500,
    "prix_tva3": true,
    "surface": 147.13,
    "surface_texte": null,
    "chambres": "3",
    "annee": null,
    "disponibilite": "tbd",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-obelix-kehlen",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/residence-obelix-kehlen/01.jpg",
      "assets/img/residence-obelix-kehlen/02.jpg",
      "assets/img/residence-obelix-kehlen/03.jpg",
      "assets/img/residence-obelix-kehlen/04.jpg",
      "assets/img/penthouse-06-residence-obelix-kehlen/01.jpg",
      "assets/img/penthouse-06-residence-obelix-kehlen/02.jpg",
      "assets/img/penthouse-06-residence-obelix-kehlen/03.jpg",
      "assets/img/penthouse-06-residence-obelix-kehlen/04.jpg",
      "assets/img/penthouse-06-residence-obelix-kehlen/05.jpg",
      "assets/img/penthouse-06-residence-obelix-kehlen/06.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is proud to announce its new project: Residence Obelix.",
        "This exclusive residence comprises 6 carefully designed apartments, offering flexible layouts ranging from 1 to 4 bedrooms.",
        "Penthouse 06:",
        "– 3 bedrooms",
        "– Floor: +3",
        "– Living area: 127,71 m2",
        "– 2 terraces : 58,05 m2",
        "Penthouse 06 is accessible by elevator, with direct access to the private area of the apartment. Upon arrival, a thoughtfully designed entrance hall harmoniously separates the living areas from the bedrooms and bathrooms offering ultimate privacy. Each room flows seamlessly onto the terraces.",
        "The living room, kitchen and dining area are nestled between two large terraces, offering abundant natural light, extending the interior to the exterior. Elevated above the neighbouring buildings, Penthouse 06 creates a unique sensation of being “above the clouds,” making this apartment truly exceptional and private.",
        "A luxurious and spacious master suite features a custom dressing room and an elegant bathroom, designed to set a tone for relaxation and functionality. Another large window in the bedroom allows you to enjoy a sensational panoramic view. The two other bedrooms share a bathroom and are located at the end of the hallway, offering absolute calm and privacy.",
        "The price shown is indicated at the super-reduced VAT rate of 3%.",
        "The indoor parking space and cellar are sold separately, for a total amount of €20,000 excluding VAT.",
        "The outdoor parking space is sold separately for an amount of €15,000 excluding VAT.",
        "Distributed over 5 floors, Residence Obelix offers a calm and comfortable living environment, ideal for those seeking both tranquility and convenience. Each apartment has a private terrace and/or balcony, offering spectacular views.",
        "Residents can admire the sunrise on one side and enjoy abundant afternoon sun on the other, before relaxing with magnificent sunsets. Ideally located on ‘Rue du Cimetière’ in Kehlen, the project is just a few kilometers from downtown Luxembourg. It also benefits from proximity to key areas such as Mersch, Mamer, and Cappellen, facilitating daily commutes and access to amenities.",
        "The project combines modern design, functionality, and strategic location, making Residence Obelix an excellent place to live."
      ]
    },
    "ancienne_url": "/portfolio/penthouse-06-residence-obelix-kehlen/"
  },
  {
    "id": "penthouse-duplex-03-residence-alice-wintrange",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "penthouse",
    "statut": "a-vendre",
    "titre": "Penthouse/Duplex 03 – Residence Alice – Wintrange",
    "localite": "Wintrange",
    "gemeinde": "Schengen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.50145,
    "lng": 6.35127,
    "prix": 1384114.3,
    "prix_tva3": true,
    "surface": 309.94,
    "surface_texte": null,
    "chambres": "4",
    "annee": "2025",
    "disponibilite": "now",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residence-alice-wintrange",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/01.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/02.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/03.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/04.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/05.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/06.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/07.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/08.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/09.jpg",
      "assets/img/penthouse-duplex-03-residence-alice-wintrange/10.jpg"
    ],
    "description": {
      "en": [
        "Exceptional Contemporary Penthouse in Wintrange – Heart of the Schengen Wine Region",
        "Discover a rare opportunity to acquire a remarkable penthouse in the charming village of Wintrange, just moments from the renowned “Baggerweieren” and surrounded by the picturesque vineyards of the Moselle region.",
        "Completed in 2025 and now in its final phase, this exceptional residence offers future owners a unique advantage: the possibility to personalise the finishing touches, including parquet flooring, sanitary equipment, and final furnishings.",
        "Alternatively, the property can be purchased as a VEFA (sale in future state of completion), with DRP Group delighted to finalise the penthouse entirely according to your wishes.",
        "A Unique Architectural Masterpiece",
        "With 310 m² of usable surface , this penthouse is defined by its impressive architecture, double-height ceilings, and extraordinary sense of openness and continuity.",
        "Bathed in natural light and offering magnificent unobstructed views over the surrounding vineyards, the property combines modern elegance with warmth and comfort.",
        "A private elevator brings you directly into your penthouse, reinforcing the exclusivity and privacy of this outstanding home.",
        "Custom-made storage solutions and a fully equipped designer kitchen are available options, allowing you to tailor the interior to your personal taste.",
        "Layout & Composition",
        "First Floor",
        "Entrance to the penthouse",
        "Bright entrance hall with view onto the garden",
        "Private staircase",
        "Second Floor – Main Living Level",
        "Private elevator entrance",
        "Spectacular 45 m² indoor terrace , fully closable from the rest of the unit",
        "Impressive electric windows (2.5 m x 3 m)",
        "Open to admire the sky and flood the space with light",
        "Fully equipped kitchen with central island opening onto a luminous dining area",
        "Dining room positioned beneath a striking double-height ceiling",
        "Spacious living room with built-in library and storage are available options",
        "Separate cloakroom",
        "Separate guest toilet",
        "Separate laundry room",
        "Large corridor elegantly connecting the living and private areas",
        "Night Area",
        "Three bedrooms (15 m² each), with their own bathroom",
        "Bathtub",
        "Walk-in shower in elegant Tivoli tiles",
        "Forth bedroom – exceptional parental suite comprising:",
        "20 m² bedroom",
        "10 m² private double-height dressing room",
        "En-suite bathroom with:",
        "Separate toilet",
        "Walk-in shower",
        "Private wellness area",
        "15 m² indoor terrace",
        "Sauna",
        "Highlights",
        "Extraordinary sense of space and comfort",
        "Unique, light-filled architecture",
        "Double-height volumes",
        "Modern yet cosy living atmosphere",
        "2 impressive private terraces",
        "Garage for two vehicles",
        "Private elevator access",
        "Comfort & Energy Efficiency",
        "Underfloor heating",
        "Triple-glazed wooden windows",
        "Electric windows",
        "Videophone system",
        "High-quality materials and finishes",
        "This penthouse perfectly combines contemporary architecture, comfort, and a privileged lifestyle in one of Luxembourg’s most desirable regions.",
        "A true gem for discerning buyers seeking exclusivity, and serenity.",
        "The quoted price includes 3% VAT (subject to approval by the relevant authorities) and reflects the property in its current state of completion.",
        "Finishing works can be completed upon request, with an additional budget starting from €100,000 , depending on the level of materials, equipment, and customisation selected."
      ]
    },
    "ancienne_url": "/portfolio/penthouse-duplex-03-residence-alice-wintrange/"
  },
  {
    "id": "apartment-b02-residences-blanchy-rene-bascharage",
    "type": "bien",
    "bereich": "real-estate",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment B02 – Residences Blanchy & René – Bascharage",
    "localite": "Bascharage",
    "gemeinde": "Käerjeng",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.57127,
    "lng": 5.91284,
    "prix": 1049094,
    "prix_tva3": false,
    "surface": 133,
    "surface_texte": null,
    "chambres": "3",
    "annee": null,
    "disponibilite": "2027",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": "residences-blanchy-rene-bascharage",
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/01.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/02.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/03.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/04.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/05.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/06.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/07.jpg",
      "assets/img/apartment-b02-residences-blanchy-rene-bascharage/08.jpg"
    ],
    "description": {
      "en": [
        "Apartment B – 02:",
        "DRP Luxembourg is proud to present the Résidences ‘Blanchy & René’, a residential complex of 6 flats with a shared basement.",
        "Located in the heart of Bascharage, close to all amenities and in a quiet residential area, the project will appeal to you with its spacious units and multiple layout options. Facing south-west, the flats are flooded with natural light. All units offer between 1 and 3 balconies or terraces, and those on the ground floor also have a large private garden.",
        "Prices include a basement parking space, a cellar and a private storage room. It is possible to purchase a second space inside.",
        "5/6 units sold",
        "Apartment B – 02",
        "Type : 3 bedroom flat",
        "Floor : First floor",
        "Terrace: 11.20 m²",
        "Weighted surface area: 132.83 m²",
        "Included in the price :",
        "Indoor space",
        "Cellar space",
        "Private storage room",
        "Additional options: :",
        "Possibility of acquiring a second indoor pitch for €35,600 incl. VAT (with 3% VAT)",
        "Why choose ‘Blanchy et René’ ?",
        "Ideal location: Located in the heart of Bascharage, in a peaceful neighbourhood yet close to all the amenities you need. Enjoy the best of both worlds: tranquillity and accessibility.",
        "Natural light: Each flat faces south-west, flooding your living spaces with natural light throughout the day. Let yourself be seduced by bright, welcoming interiors.",
        "Exceptional Outdoor Spaces: With 1 to 3 balconies or terraces per flat, as well as spacious private gardens for the ground floor units, you’ll have plenty of space to relax and enjoy the outdoors.",
        "Premium Amenities: Our spacious units offer the flexibility to personalise your living space to suit your tastes.",
        "Amenities Included: The price includes a secure indoor parking space, a cellar, and a private storage room for all your storage needs. What’s more, the option of buying a second parking space gives you even more flexibility.",
        "Don’t miss this unique opportunity to live in a modern, refined setting, where every detail has been thought of for your comfort and well-being.",
        "We look forward to welcoming you to our offices in Gonderange, where we can present the project to you in detail."
      ]
    },
    "ancienne_url": "/portfolio/apartment-b02-residences-blanchy-rene-bascharage/"
  },
  {
    "id": "for-sale-house-in-lintgen",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "maison",
    "statut": "a-vendre",
    "titre": "House in Lintgen",
    "localite": "Lintgen",
    "gemeinde": "Lintgen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.72232,
    "lng": 6.12789,
    "prix": 1500000,
    "prix_tva3": false,
    "surface": 220,
    "surface_texte": null,
    "chambres": "4",
    "annee": "2012",
    "disponibilite": null,
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-house-in-lintgen/01.jpg",
      "assets/img/for-sale-house-in-lintgen/02.jpg",
      "assets/img/for-sale-house-in-lintgen/03.jpg",
      "assets/img/for-sale-house-in-lintgen/04.jpg",
      "assets/img/for-sale-house-in-lintgen/05.jpg",
      "assets/img/for-sale-house-in-lintgen/06.jpg",
      "assets/img/for-sale-house-in-lintgen/07.jpg",
      "assets/img/for-sale-house-in-lintgen/08.jpg",
      "assets/img/for-sale-house-in-lintgen/09.jpg",
      "assets/img/for-sale-house-in-lintgen/10.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for sale a beautiful semi-detached house on the cul-de-sac Rue Knepel in Lintgen.",
        "Located in the hills above Lintgen, a highly sought-after, quiet neighbourhood close to nature, it boasts breathtaking panoramic views.",
        "The house, which currently has four bedrooms, also features an integrated 33 m² apartment. If necessary, it can easily be converted into two bedrooms.",
        "Spread over three floors flooded with natural light, the house has a gross surface area of approximately 270m², of which 220m² is living space, and is composed as follows:",
        "Ground floor:",
        "– a spacious entrance hall with a cloakroom",
        "– a separate toilet with shower",
        "– an open-plan fitted kitchen",
        "– a dining room",
        "– a living room with access to the west-facing balcony",
        "– an office room",
        "Garden level:",
        "– a hallway leading to all the rooms",
        "– a bedroom of approximately 16m²",
        "– a bedroom of approximately 18.5m², opening onto the terrace and garden",
        "– a bathroom with bath and toilet",
        "– an integrated apartment, offering over 33m² and featuring a kitchenette and its own shower room with toilet. The accommodation unit is also accessible directly from outside",
        "– the utility room and cellar",
        "First floor:",
        "– A large landing with a kitchenette at the end",
        "– A bedroom measuring approximately 11.6m², with its own shower room with toilet and additional space under the eaves. It provides access to a west-facing terrace.",
        "– a large room of almost 42m², which can be used in many ways and can also be easily subdivided into smaller rooms.",
        "Other:",
        "– a 21m² garage",
        "– two outdoor parking spaces",
        "– a large south-west facing garden",
        "Technical information:",
        "– Partially wooden construction",
        "– Underfloor heating",
        "– Triple glazing",
        "– 4.24 acres of land",
        "– availability: mid-February",
        "The property is ideal for families, thanks in particular to its quiet location on a cul-de-sac.",
        "Children can play in the street, and there is a community vegetable garden and a meadow where donkeys are kept nearby.",
        "Bus and train connections and access to the motorway are excellent in Lintgen, and there are several shops.",
        "Don’t miss this rare opportunity in a highly sought-after neighborhood."
      ]
    },
    "ancienne_url": "/portfolio/for-sale-house-in-lintgen/"
  },
  {
    "id": "for-sale-house-in-waldbredimus-2",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "maison",
    "statut": "a-vendre",
    "titre": "House in Waldbredimus",
    "localite": "Waldbredimus",
    "gemeinde": "Waldbredimus",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.55723,
    "lng": 6.28709,
    "prix": 1695000,
    "prix_tva3": false,
    "surface": 368,
    "surface_texte": null,
    "chambres": "5",
    "annee": "2017",
    "disponibilite": "tbd",
    "energie": "B / B",
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-house-in-waldbredimus-2/01.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/02.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/03.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/04.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/05.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/06.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/07.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/08.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/09.jpg",
      "assets/img/for-sale-house-in-waldbredimus-2/10.jpg"
    ],
    "description": {
      "en": [
        "Beautiful 5-Bedroom House with Swimming Pool in Waldbredimus",
        "DRP Group is pleased to offer for sale this beautiful family home located in Waldbredimus, in the Hannert Lautesch residential area.",
        "Set on a 5.36-are plot, this beautifully maintained property offers an exceptional living environment and all the amenities required for comfortable family living.",
        "The house is in excellent condition and requires no work or renovation. With a total surface area of 368 m², it offers generous living spaces and carefully designed features throughout.",
        "Ground Floor",
        "Upon entering, you will discover:",
        "A spacious entrance hall with built-in cloakroom and direct access to the garage;",
        "A separate guest toilet;",
        "A large open-plan living area comprising an elegant dining area and a comfortable lounge, visually separated by a fireplace;",
        "A fully equipped kitchen adjoining the dining room, featuring a delightful hidden surprise: an integrated door provides access to a practical utility kitchen equipped with an oven, refrigerator and plenty of storage space;",
        "A bar with a built-in counter located next to the living room, providing direct access to the garden — the perfect spot for entertaining friends or enjoying sunny days;",
        "Direct access from the living room to the terrace and garden.",
        "An Outdoor Space Designed to Enjoy the Sunny Days",
        "The terrace, complete with a pergola, can be enclosed on two sides using specially designed shutters, allowing you to enjoy this outdoor space throughout the year.",
        "Facing due south, the garden is a true extension of the living space. It features a swimming pool and carefully landscaped surroundings, creating an intimate, peaceful and relaxing atmosphere.",
        "A true haven of peace, ideal for comfortable family living as well as entertaining friends and enjoying special moments together.",
        "First Floor",
        "The sleeping area offers optimal comfort and comprises:",
        "Three bedrooms, each measuring between 14 and 15 m²;",
        "A shower room with WC;",
        "A superb master bedroom, fully fitted with a dressing room and a private en-suite bathroom featuring a WC, walk-in shower and bathtub.",
        "For added everyday convenience, a laundry chute has been installed on this floor, allowing laundry to be sent directly to the utility room in the basement.",
        "Second Floor",
        "The attic has been cleverly converted to create a fifth bedroom, providing a particularly pleasant additional living space.",
        "This bedroom has its own dressing room, as well as numerous built-in cupboards, making excellent use of the available storage space.",
        "Even this attic space is equipped with air conditioning, ensuring a comfortable temperature throughout the year.",
        "Basement",
        "The particularly spacious and functional basement offers several well-appointed areas:",
        "A large heated room of more than 25 m², currently used as a fitness room and equipped with a sauna;",
        "A shower room with WC;",
        "A practical laundry room equipped with several built-in cupboards and a washbasin, with the laundry chute leading directly into the room;",
        "A utility/technical room also featuring several integrated storage areas;",
        "A second heated room of approximately 18 m², currently used as a workshop/office, offering a wide range of possibilities depending on the future owners’ needs.",
        "The entire house has been thoughtfully designed to provide comfort, functionality and an excellent quality of life, with abundant storage space and rooms that can easily be adapted to suit the needs of every member of the family.",
        "Technical Features and Amenities",
        "This property benefits from a wide range of features designed to optimise everyday comfort, security and energy efficiency:",
        "10,000-litre rainwater harvesting tank, connected to a tap in the garage as well as to certain sanitary fixtures throughout the house;",
        "Water softener installed on the main water supply;",
        "Air conditioning in all living areas, with the option to adjust and control the system remotely via a mobile application;",
        "Gas heating;",
        "Photovoltaic solar panels installed on both sides of the roof;",
        "Fly screens in all bedrooms;",
        "Swimming pool equipped with its own heat pump, allowing the swimming season to be extended;",
        "Triple-glazed aluminium windows, providing excellent thermal and acoustic insulation;",
        "Alarm system, also controllable remotely via a mobile application;",
        "Electric vehicle charging station installed in the garage;",
        "Energy Performance Certificate: B / B.",
        "A Prime Location",
        "Located in Waldbredimus, this property enjoys a quiet and green residential setting, ideal for those looking for an exceptional quality of life surrounded by nature.",
        "The municipality nevertheless provides convenient access to the main roads and amenities, while offering a peaceful environment just a few kilometres from the capital.",
        "Thanks to its strategic location, the French and German border regions are also easily and quickly accessible."
      ]
    },
    "ancienne_url": "/portfolio/for-sale-house-in-waldbredimus-2/"
  },
  {
    "id": "for-rent-cessange",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "appartement",
    "statut": "a-louer",
    "titre": "Apartment in Cessange",
    "localite": "Cessange",
    "gemeinde": "Luxembourg",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.58992,
    "lng": 6.10587,
    "prix": 2400,
    "prix_tva3": false,
    "surface": 65,
    "surface_texte": null,
    "chambres": "1",
    "annee": "2018",
    "disponibilite": "01.11.2026",
    "energie": "B / B",
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-rent-cessange/01.jpg",
      "assets/img/for-rent-cessange/02.jpg",
      "assets/img/for-rent-cessange/03.jpg",
      "assets/img/for-rent-cessange/04.jpg",
      "assets/img/for-rent-cessange/05.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for rent a very attractive unfurnished ground-floor flat in a residence on Boulevard du Brill in Luxembourg-Cessange.",
        "The residence is located in a purely residential area, very quiet, with a bus stop just 20m away. The city centre, central station and Cloche d’Or are just a few minutes away. Parc de Cessange is 200 m from the residence.",
        "The flat has a surface area of 65 m2 and comprises:",
        "– an entrance hall with a storage room",
        "– a shower room with toilet",
        "– a bedroom of over 12 m2",
        "– an open-plan fitted kitchen",
        "– a light-filled living and dining room",
        "– a covered terrace and private garden (west-facing)",
        "The property is completed by a parking space in the basement of the residence.",
        "Technical details :",
        "– Energy efficiency class B, thermal insulation class B",
        "– Triple glazing",
        "– Electric external blinds",
        "– Videophone",
        "– Lift",
        "– Availability: 1st Novembre 2026"
      ]
    },
    "ancienne_url": "/portfolio/for-rent-cessange/"
  },
  {
    "id": "for-rent-penthouse-in-steinsel",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "penthouse",
    "statut": "a-louer",
    "titre": "Penthouse in Steinsel",
    "localite": "Steinsel",
    "gemeinde": "Steinsel",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.67747,
    "lng": 6.12447,
    "prix": 3500,
    "prix_tva3": false,
    "surface": 125,
    "surface_texte": null,
    "chambres": "3",
    "annee": "2025",
    "disponibilite": "now",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-rent-penthouse-in-steinsel/01.jpg",
      "assets/img/for-rent-penthouse-in-steinsel/02.jpg",
      "assets/img/for-rent-penthouse-in-steinsel/03.jpg",
      "assets/img/for-rent-penthouse-in-steinsel/04.jpg",
      "assets/img/for-rent-penthouse-in-steinsel/05.jpg",
      "assets/img/for-rent-penthouse-in-steinsel/06.jpg",
      "assets/img/for-rent-penthouse-in-steinsel/07.jpg"
    ],
    "description": {
      "en": [
        "Stunning penthouse in Steinsel to let DRP Group is offering this stunning penthouse in Steinsel to let.",
        "The property is situated in a quiet and sought-after location, within easy reach of all key amenities such as supermarkets, a chemist, restaurants, a gym, schools and public transport (bus and train).",
        "The new-build property was recently completed.",
        "With a living area of approx. 125 m², this penthouse impresses with its spacious layout, exceptional natural light and modern fittings. It offers a comfortable and functional living environment and is ideal for a couple or a family looking for a high-quality property.",
        "Layout of the property:",
        "– Entrance hall",
        "– Spacious, light-filled living room",
        "– Cosy dining area",
        "– Modern, fully fitted kitchen",
        "– Large 15 m² balcony with a lovely view",
        "– Corridor with storage space leading to the sleeping area",
        "– Master suite with dressing area and en-suite shower room",
        "– Two further bedrooms",
        "– Bathroom with bath and shower",
        "Basement:",
        "– An indoor parking space",
        "The residential complex also features a communal outdoor car park with six spaces, reserved exclusively for residents and offering added convenience when parking.",
        "Available immediately."
      ]
    },
    "ancienne_url": "/portfolio/for-rent-penthouse-in-steinsel/"
  },
  {
    "id": "for-sale-apartment-in-dommeldange",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment in Dommeldange",
    "localite": "Dommeldange",
    "gemeinde": "Luxembourg",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.63436,
    "lng": 6.13807,
    "prix": 849000,
    "prix_tva3": false,
    "surface": 111,
    "surface_texte": null,
    "chambres": "2",
    "annee": null,
    "disponibilite": "now",
    "energie": "F / G",
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-apartment-in-dommeldange/01.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/02.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/03.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/04.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/05.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/06.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/07.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/08.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/09.jpg",
      "assets/img/for-sale-apartment-in-dommeldange/10.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for sale a beautiful flat on the first floor of a residence on Rue Comte Joseph de Ferraris in Dommeldange.",
        "The flat is located in one of the most sought-after neighbourhoods around Luxembourg City, and more specifically in one of the most renowned residences in the area, the “Pavillon de France” with a common swimming pool and a concierge.",
        "This building was constructed in the early 1970s and has recently been given a facelift thanks to the renovation of its façade in 2023.",
        "The flat offers a surface area of approximately 111 sqm and is composed as follows:",
        "– a spacious entrance hall leading to a 2.3 m wide corridor",
        "– a large living room flooded with natural light, containing the lounge and dining room and offering more than 30 m²",
        "– a terrace of more than 20 m² (south-facing) accessible from the lounge and the large bedroom",
        "– a separate kitchen with a small storage room, covering a total area of approximately 14m²",
        "– two bedrooms measuring 15m² and 17m² respectively",
        "– a shower room with a walk-in shower",
        "– a separate dressing room measuring almost 5m², which can also be used as a storage room",
        "– a separate toilet",
        "The property is complemented by a private cellar.",
        "Technical information:",
        "– Energy efficiency class F, thermal insulation class G",
        "– Solid wood flooring",
        "– Double glazing",
        "– Lift",
        "– Gas boiler (2021)",
        "– Facade (2023)",
        "– Swimming pool",
        "– Concierge",
        "The building has a large number of parking spaces, reserved for the exclusive use of residents of the residence and belonging to the co-ownership."
      ]
    },
    "ancienne_url": "/portfolio/for-sale-apartment-in-dommeldange/"
  },
  {
    "id": "for-sale-house-in-angelsberg",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "maison",
    "statut": "a-vendre",
    "titre": "House in Angelsberg",
    "localite": "Angelsberg",
    "gemeinde": "Fischbach",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.76487,
    "lng": 6.16201,
    "prix": 850000,
    "prix_tva3": false,
    "surface": 140,
    "surface_texte": null,
    "chambres": "4",
    "annee": "1968",
    "disponibilite": null,
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-house-in-angelsberg/01.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for sale a house in need of partial renovation with great potential on Rue de Mersch in Angelsberg, in the municipality of Fischbach.",
        "The house is situated on a plot of 8.85 ares, and the south-west facing garden is ideal for enjoying plenty of sunshine almost all day long.",
        "The house, with a living area of approximately 140m² and a gross floor area of approximately 220m², is laid out as follows:",
        "Ground floor:",
        "– a spacious entrance hall",
        "– a large living room, formerly divided into two rooms and now offering over 35m²",
        "– a bathroom with toilet",
        "– a large, separate, fitted kitchen",
        "– a bedroom of approximately 15m²",
        "– a bedroom or study of approximately 12.5m²",
        "First floor:",
        "– a bedroom",
        "– apart from a fourth bedroom, the rest of the first floor has never been fitted out.",
        "It offers enormous potential, and converting this space into living space is relatively straightforward.",
        "Basement:",
        "– a room of approximately 12m² that could serve as a storeroom or workshop",
        "– a garage for one car and additional storage space",
        "– two large separate cellars",
        "The terrace, which was built at a later date and separately from the main building and is accessed from the living room, along with the room situated beneath it, has subsided slightly over the years. It needs either to be stabilised or rebuilt.",
        "Technical information:",
        "– Heating system: 2016",
        "– Solar panels: 2021",
        "– Façade: 2021",
        "Situated just a few minutes from Larochette and Mersch, this location offers the perfect balance between being close to nature on the one hand, and having access to a range of shops and services as well as public transport on the other."
      ]
    },
    "ancienne_url": "/portfolio/for-sale-house-in-angelsberg/"
  },
  {
    "id": "for-sale-apartment-in-schifflange",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "appartement",
    "statut": "a-vendre",
    "titre": "Apartment in Schifflange",
    "localite": "Schifflange",
    "gemeinde": "Schifflange",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.50627,
    "lng": 6.01182,
    "prix": 600000,
    "prix_tva3": false,
    "surface": 90,
    "surface_texte": null,
    "chambres": "2",
    "annee": "2003",
    "disponibilite": "now",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-apartment-in-schifflange/01.jpg",
      "assets/img/for-sale-apartment-in-schifflange/02.jpg",
      "assets/img/for-sale-apartment-in-schifflange/03.jpg",
      "assets/img/for-sale-apartment-in-schifflange/04.jpg",
      "assets/img/for-sale-apartment-in-schifflange/05.jpg",
      "assets/img/for-sale-apartment-in-schifflange/06.jpg",
      "assets/img/for-sale-apartment-in-schifflange/07.jpg",
      "assets/img/for-sale-apartment-in-schifflange/08.jpg",
      "assets/img/for-sale-apartment-in-schifflange/09.jpg",
      "assets/img/for-sale-apartment-in-schifflange/10.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for sale an attractive penthouse-duplex on the second and third floors of a small residence in the Cité Emile Mayrisch in Schifflange.",
        "The residence is located in a quiet residential area, in a dead-end street close to the railways.",
        "The property is also close to all Schifflange’s amenities, with Esch and Kayl just a few minutes away.",
        "The 90m2 flat is composed as follows:",
        "On the 2nd floor:",
        "– an entrance hall",
        "– a bedroom of around 11.5m2 giving access to a balcony",
        "– a bedroom of around 14.8m2",
        "On the 3rd floor:",
        "– a separate WC",
        "– an open space next to the stairs that is perfect for an office or relaxation area",
        "– a spacious bathroom with a large bath, a shower and a toilet",
        "– a living room of over 35m2, containing the open-plan kitchen, the dining room and the lounge which gives access to the balcony. This room has a high ceiling.",
        "– a 7m2 balcony",
        "There is also a private cellar and a garage in the basement.",
        "A private outdoor parking lot is also available, although it is not listed in the cadastre.",
        "There is no lift in the residence.",
        "The train station is within walking distance, but you can’t hear the train go by."
      ]
    },
    "ancienne_url": "/portfolio/for-sale-apartment-in-schifflange/"
  },
  {
    "id": "for-sale-penthouse-in-bonnevoie",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "penthouse",
    "statut": "a-vendre",
    "titre": "Penthouse in Bonnevoie",
    "localite": "Bonnevoie",
    "gemeinde": "Luxembourg",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.59611,
    "lng": 6.13984,
    "prix": 895000,
    "prix_tva3": false,
    "surface": 98.25,
    "surface_texte": null,
    "chambres": "2",
    "annee": "2010",
    "disponibilite": "now",
    "energie": "C / C",
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-penthouse-in-bonnevoie/01.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/02.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/03.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/04.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/05.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/06.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/07.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/08.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/09.jpg",
      "assets/img/for-sale-penthouse-in-bonnevoie/10.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for sale a beautiful flat situated on the second and top floor of a residential building on Rue du Cimetière in Bonnevoie.",
        "As the second building in the row, it enjoys a tranquillity that is almost impossible to find in the heart of Bonnevoie. The little private park in front of the building enhances the quality of life, and the west-facing balcony and terrace allow you to enjoy the peace and quiet until the last rays of the sun at the end of the day.",
        "The 98.25 m² penthouse comprises:",
        "– an entrance hall with built-in wardrobe",
        "– a bright bedroom with built-in wardrobes and storage",
        "– a second bedroom or study",
        "– a west-facing balcony accessible from both bedrooms",
        "– a utility room with a private laundry area",
        "– a shower room with a toilet and skylight",
        "– a separate toilet",
        "– a large living area of approximately 50 m² comprising the open-plan kitchen, living room and dining room.",
        "– a west-facing terrace of over 20 m²",
        "The property also includes a cellar and a parking space in the basement.",
        "Technical details:",
        "– Energy efficiency rating C, thermal insulation rating C",
        "– Wooden flooring in the bedrooms",
        "– Intercom",
        "– Fibre optic broadband in the building",
        "– Lift",
        "The flat is ideally situated close to a wide range of shops and the Delhaize supermarket, and is very well served by public transport. No major works are planned; only a minor refurbishment of the flat is required."
      ]
    },
    "ancienne_url": "/portfolio/for-sale-penthouse-in-bonnevoie/"
  },
  {
    "id": "for-sale-house-in-wellenstein",
    "type": "bien",
    "bereich": "luxembourg",
    "categorie": "maison",
    "statut": "a-vendre",
    "titre": "House in Wellenstein",
    "localite": "Wellenstein",
    "gemeinde": "Schengen",
    "adresse": null,
    "adresse_exacte": false,
    "lat": 49.52484,
    "lng": 6.34253,
    "prix": 1170000,
    "prix_tva3": false,
    "surface": 148,
    "surface_texte": null,
    "chambres": "2",
    "annee": "1988",
    "disponibilite": "now",
    "energie": null,
    "unites_total": null,
    "vente": null,
    "unites": [],
    "projet": null,
    "a_laffiche": false,
    "video": null,
    "avant": null,
    "apres": null,
    "brochure": null,
    "images": [
      "assets/img/for-sale-house-in-wellenstein/01.jpg",
      "assets/img/for-sale-house-in-wellenstein/02.jpg",
      "assets/img/for-sale-house-in-wellenstein/03.jpg",
      "assets/img/for-sale-house-in-wellenstein/04.jpg",
      "assets/img/for-sale-house-in-wellenstein/05.jpg",
      "assets/img/for-sale-house-in-wellenstein/06.jpg",
      "assets/img/for-sale-house-in-wellenstein/07.jpg",
      "assets/img/for-sale-house-in-wellenstein/08.jpg",
      "assets/img/for-sale-house-in-wellenstein/09.jpg",
      "assets/img/for-sale-house-in-wellenstein/10.jpg"
    ],
    "description": {
      "en": [
        "DRP Group is offering for sale a beautiful detached house on rue des Jardins in Wellenstein.",
        "This is a quiet, purely residential cul-de-sac with almost no traffic except for residents. Set on a 16.5-acre plot, the house will charm you with its sunny location and exceptional view of the vineyards.",
        "The sun shines on the house all day long. The side terrace is sunny in the morning and the garden behind the building is bathed in sunshine from midday onwards.",
        "The house has approximately 148m² of living space on two floors and is laid out as follows:",
        "Ground floor:",
        "– a spacious entrance hall with room for a large wardrobe, giving direct access to the single-car garage",
        "– a separate toilet",
        "– a large, light-filled living room with access to the side terrace",
        "– a dining room with access to the rear terrace",
        "– a separate kitchen, also with access to the rear terrace",
        "– a bathroom with shower and toilet, partially renovated in 2019",
        "– a bedroom measuring 18.7m²",
        "Garden level:",
        "– a large hall leading to the various rooms",
        "– a bedroom measuring 18.7m²",
        "– a room that could be used as a bathroom and/or toilet",
        "– a 30m² workshop, heated and with direct access to the garden",
        "– a 23.2m² room containing the heating system and a sauna",
        "– a cellar",
        "– a wine cellar",
        "This house is one of a kind due to its large plot of land and the absolute tranquillity it offers.",
        "There are numerous hiking trails in the immediate vicinity and it is surrounded by nature on all sides.",
        "Technical information:",
        "– Energy performance certificate currently being prepared",
        "– Underfloor heating on the ground floor",
        "– Double glazing (partially redone in 2019)",
        "– Oil-fired boiler (Buderus 2018)",
        "– Photovoltaic panels"
      ]
    },
    "ancienne_url": "/portfolio/for-sale-house-in-wellenstein/"
  }
],

  team: [
  {
    "id": "philippe-rausch",
    "nom": "Philippe RAUSCH",
    "role": "Managing Partner | DRP Group",
    "photo": "assets/img/team/philippe-rausch.jpg",
    "bereiche": [
      "luxembourg",
      "real-estate"
    ],
    "url": "/team/philippe-rausch/",
    "bio": {
      "en": [
        "Philippe is responsible in leading the real estate development, as well as the agency.",
        "'I see it as my obligation to be there for my clients, and understand their needs and wants.'",
        "Born and raised in Luxembourg, Philippe knows the country he is so fond of very well. Real estate has always been a passion of his, and he has a deep understanding of the business with its biggest value being the people. A professional attitude, rational thinking and having an eye for detail, and a close collaboration with clients and suppliers is key in achieving optimal success, and crucial to the strategy and positioning of the company.",
        "Philippe has an MSc Finance from EBS in London (UK), and a BA with honours from GIHE, a Swiss hotel business school, with a specialisation in Finance and Real Estate.",
        "Throughout his career, he has mostly worked in the financial sector, for institutional clients and hotel corporate offices in Geneva, Paris and Luxembourg. He has an in-depth knowledge in private banking, in feasibility studies for hotel openings, and real estate development.",
        "The crucial facts he learned throughout his career, is that nothing is impossible and that there is a solution for every problem."
      ]
    },
    "groupe": "associes",
    "photo_profil": "assets/img/team/philippe-rausch-portrait.jpg"
  },
  {
    "id": "david-rausch",
    "email": "info@drp-architecture.lu",
    "nom": "David RAUSCH",
    "role": "Managing Partner | DRP Architecture",
    "photo": "assets/img/team/david-rausch.jpg",
    "bereiche": [
      "architecture"
    ],
    "url": "https://www.drp-architecture.lu/team/",
    "groupe": "associes"
  },
  {
    "id": "romain-weynand",
    "nom": "Romain WEYNAND",
    "role": "Partner | DRP Group",
    "photo": "assets/img/team/romain-weynand.jpg",
    "bereiche": [],
    "url": "/team/romain-weynand/",
    "bio": {
      "en": [
        "Born and raised in Luxembourg, Romain brings his business advisory expertise to the team as a partner of DRP Group. Entrepreneurship, facing challenges and finding appropriate solutions have always been his motivation.",
        "Romain holds a Master degree in Finance and Logistics from Cranfield University, School of Management (UK) and a Bachelor degree with honors in Hospitality Management and Business Administration from Les Roches-Gruyère University of Applied Sciences/Glion (CH), with a specialisation in Finance and Real Estate.",
        "Besides his knowledge of the Luxembourg market, Romain acquired an international working background: he gained experience in the fields of finance, supply chain management and professional services in the Middle East (Dubai and Qatar), Amsterdam and Zurich working for Group Marriott International Inc., Lufthansa Cargo, La Prairie, a Beiersdorf company, and PageGroup.",
        "Romain is passionate about real estate, industry innovation, addressing complex processes and using up-to-date technologies to improve the operational functions of a business. He appreciates when projects are running smoothly and develops tailor-made solutions to keep his clients satisfied."
      ]
    },
    "groupe": "associes"
  },
  {
    "id": "karim-elian",
    "nom": "Karim ELIAN",
    "role": "Architect | Project Manager",
    "photo": "assets/img/team/karim-elian.jpg",
    "bereiche": [],
    "url": "https://www.drp-architecture.lu/team/",
    "groupe": "equipe"
  },
  {
    "id": "alberto-campos",
    "nom": "Alberto CAMPOS",
    "role": "Architect | Project Manager",
    "photo": "assets/img/team/alberto-campos.jpg",
    "bereiche": [],
    "url": "https://www.drp-architecture.lu/team/",
    "groupe": "equipe"
  },
  {
    "id": "ergun-ayral",
    "nom": "Ergun AYRAL",
    "role": "Interior Designer",
    "photo": "assets/img/team/ergun-ayral.jpg",
    "bereiche": [],
    "url": "https://www.drp-architecture.lu/team/",
    "groupe": "equipe"
  },
  {
    "id": "nathalie-el-asmar",
    "nom": "Nathalie EL ASMAR",
    "role": "Architect",
    "photo": "assets/img/team/nathalie-el-asmar.jpg",
    "bereiche": [],
    "url": "https://www.drp-architecture.lu/team/",
    "groupe": "equipe"
  },
  {
    "id": "rosa-aparici",
    "nom": "Rosa APARICI",
    "role": "Architect | Interior Designer",
    "photo": "assets/img/team/rosa-aparici.jpg",
    "bereiche": [],
    "url": "https://www.drp-architecture.lu/team/",
    "groupe": "equipe"
  },
  {
    "id": "marc-schuman",
    "nom": "Marc SCHUMAN",
    "role": "Real Estate Advisor",
    "photo": "assets/img/team/marc-schuman.jpg",
    "bereiche": [
      "luxembourg"
    ],
    "url": "https://www.drp-architecture.lu/team/",
    "email": "m.schuman@drp-group.lu",
    "tel": "+352 621 41 30 30",
    "groupe": "equipe"
  }
]
};
