// ─── PRIMÄRE QUELLEN ─────────────────────────────────────────────────────
// Themenauswahl basiert NUR auf Primärquellen
// Inhaltsgenerierung nutzt Primär + Sekundärquellen

export const PRIMARY_SOURCES = [
  // === AGENTUREN (neutral) ===
  { name: "Reuters",             url: "https://feeds.reuters.com/reuters/topNews",                               lean: "neutral", type: "agency",    country: "int" },
  { name: "AP News",             url: "https://apnews.com/rss",                                                 lean: "neutral", type: "agency",    country: "int" },
  { name: "AFP",                 url: "https://news.google.com/rss/search?q=source:AFP&hl=de&gl=DE&ceid=DE:de", lean: "neutral", type: "agency",    country: "int" },
  { name: "Bloomberg",           url: "https://feeds.bloomberg.com/markets/news.rss",                           lean: "neutral", type: "agency",    country: "int" },

  // === ÜBERREGIONALE TAGESZEITUNGEN ===
  { name: "Handelsblatt",        url: "https://www.handelsblatt.com/contentexport/feed/politik",                lean: "neutral", type: "newspaper", country: "de"  },

  // === ÖFFENTLICH-RECHTLICHE ===
  { name: "Tagesschau",          url: "https://www.tagesschau.de/xml/rss2/",                                    lean: "neutral", type: "public",    country: "de"  },
  { name: "ZDF",                 url: "https://www.zdf.de/rss/zdf/politik-gesellschaft",                        lean: "neutral", type: "public",    country: "de"  },
  { name: "Deutschlandfunk",     url: "https://www.deutschlandfunk.de/politikportal-100.rss",                   lean: "neutral", type: "public",    country: "de"  },

  // === GROSSBRITANNIEN ===
  { name: "BBC News World",      url: "https://feeds.bbci.co.uk/news/world/rss.xml",                            lean: "neutral", type: "public",    country: "int" },
  { name: "BBC News",            url: "https://feeds.bbci.co.uk/news/rss.xml",                                  lean: "neutral", type: "public",    country: "int" },
  { name: "The Guardian",        url: "https://www.theguardian.com/world/rss",                                  lean: "left",    type: "newspaper", country: "int" },
  { name: "Financial Times",     url: "https://www.ft.com/?format=rss",                                        lean: "neutral", type: "newspaper", country: "int" },
  { name: "The Economist",       url: "https://www.economist.com/rss/the_economist_full_rss.xml",              lean: "neutral", type: "magazine",  country: "int" },

  // === USA ===
  { name: "New York Times",      url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",                lean: "left",    type: "newspaper", country: "int" },
  { name: "Washington Post",     url: "https://feeds.washingtonpost.com/rss/world",                            lean: "left",    type: "newspaper", country: "int" },
  { name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",                          lean: "right",   type: "newspaper", country: "int" },
  { name: "NPR",                 url: "https://feeds.npr.org/1001/rss.xml",                                    lean: "left",    type: "public",    country: "int" },

  // === EUROPA & INTERNATIONAL ===
  { name: "NZZ International",   url: "https://www.nzz.ch/international.rss",                                  lean: "right",   type: "newspaper", country: "int" },
  { name: "Le Monde",            url: "https://www.lemonde.fr/rss/une.xml",                                    lean: "left",    type: "newspaper", country: "int" },
  { name: "Al Jazeera",          url: "https://www.aljazeera.com/xml/rss/all.xml",                             lean: "neutral", type: "public",    country: "int" },
  { name: "Deutsche Welle",      url: "https://rss.dw.com/rdf/rss-de-all",                                    lean: "neutral", type: "public",    country: "de"  },
];

// ─── SEKUNDÄRE QUELLEN ────────────────────────────────────────────────────
// Nur für Inhaltsgenerierung — nicht für Themenauswahl

export const SECONDARY_SOURCES = [
  // === ÜBERREGIONALE TAGESZEITUNGEN ===
  { name: "FAZ",                    url: "https://www.faz.net/rss/aktuell/",                                      lean: "right",   type: "newspaper", country: "de" },
  { name: "Süddeutsche Zeitung",    url: "https://rss.sueddeutsche.de/rss/Alles",                                 lean: "left",    type: "newspaper", country: "de" },
  { name: "Die Welt",               url: "https://www.welt.de/feeds/latest.rss",                                  lean: "right",   type: "newspaper", country: "de" },
  { name: "taz",                    url: "https://taz.de/!p4608;rss",                                             lean: "left",    type: "newspaper", country: "de" },
  { name: "Tagesspiegel",           url: "https://www.tagesspiegel.de/contentexport/feed/home",                   lean: "left",    type: "newspaper", country: "de" },
  { name: "Bild",                   url: "https://www.bild.de/rss-feeds/rss-16725492,sort=1,view=rss2.bild.xml",  lean: "right",   type: "tabloid",   country: "de" },
  { name: "nd-aktuell",             url: "https://www.nd-aktuell.de/feeds/all.xml",                               lean: "left",    type: "newspaper", country: "de" },

  // === ÖFFENTLICH-RECHTLICHE REGIONAL ===
  { name: "BR Nachrichten",         url: "https://www.br.de/nachrichten/index.rss",                               lean: "neutral", type: "public",    country: "de" },
  { name: "MDR Nachrichten",        url: "https://www.mdr.de/nachrichten/index-rss.xml",                         lean: "neutral", type: "public",    country: "de" },

  // === MAGAZINE & WOCHENZEITUNGEN ===
  { name: "Spiegel Online",         url: "https://www.spiegel.de/schlagzeilen/index.rss",                        lean: "left",    type: "magazine",  country: "de" },
  { name: "Zeit Online",            url: "https://newsfeed.zeit.de/index",                                        lean: "left",    type: "magazine",  country: "de" },
  { name: "Focus Online",           url: "https://rss.focus.de/fol/XML/rss_folnews.xml",                         lean: "right",   type: "magazine",  country: "de" },
  { name: "Stern",                  url: "https://www.stern.de/feed/standard/all/",                               lean: "left",    type: "magazine",  country: "de" },
  { name: "Cicero",                 url: "https://www.cicero.de/rss.xml",                                        lean: "right",   type: "magazine",  country: "de" },

  // === REGIONALZEITUNGEN ===
  { name: "RP Online",              url: "https://rp-online.de/feed.rss",                                        lean: "neutral", type: "regional",  country: "de" },
  { name: "Frankfurter Rundschau",  url: "https://www.fr.de/?_XML=rss",                                          lean: "left",    type: "regional",  country: "de" },
  { name: "Kölner Stadt-Anzeiger",  url: "https://www.ksta.de/feed/",                                            lean: "neutral", type: "regional",  country: "de" },
  { name: "Stuttgarter Zeitung",    url: "https://www.stuttgarter-zeitung.de/rss/feed.rss",                      lean: "neutral", type: "regional",  country: "de" },
  { name: "Hamburger Abendblatt",   url: "https://www.abendblatt.de/feed/",                                      lean: "neutral", type: "regional",  country: "de" },
  { name: "Berliner Zeitung",       url: "https://www.berliner-zeitung.de/feed.rss",                             lean: "left",    type: "regional",  country: "de" },
  { name: "Merkur",                 url: "https://www.merkur.de/rss/feed/",                                      lean: "neutral", type: "regional",  country: "de" },
  { name: "Sächsische Zeitung",     url: "https://www.saechsische.de/feeds/rss/nachrichten/",                    lean: "neutral", type: "regional",  country: "de" },

  // === DIGITAL-NATIVE ===
  { name: "n-tv",                   url: "https://www.n-tv.de/rss/Politik",                                      lean: "neutral", type: "digital",   country: "de" },
  { name: "The Pioneer",            url: "https://www.thepioneer.de/rss",                                        lean: "right",   type: "digital",   country: "de" },
];

// ─── KATEGORIEN ───────────────────────────────────────────────────────────
export const CATEGORIES = [
  {
    id: "politik-international",
    label: "Politik & Wirtschaft",
    sub: "International",
    icon: "🌍",
    keywords: ["international", "world", "global", "EU", "USA", "China", "Russland", "Ukraine", "NATO", "G7", "G20", "Europa", "Krieg", "Diplomatie", "Trump", "Sanktionen", "Gipfel"],
    accentColor: "#3B5BDB",
    bgColor: "#EEF2FF",
  },
  {
    id: "politik-deutschland",
    label: "Politik & Wirtschaft",
    sub: "Deutschland",
    icon: "🇩🇪",
    keywords: [
      "Bundestag", "Bundesrat", "Bundesregierung", "Bundeskanzler", "Bundesminister",
      "Bundesverfassungsgericht", "Bundesbank", "Bundeswehr",
      "SPD", "CDU", "CSU", "Grüne", "FDP", "AfD", "BSW", "Linke",
      "Scholz", "Merz", "Habeck", "Baerbock", "Lindner", "Pistorius", "Weidel",
      "Berlin", "Bundeshaushalt", "Koalition", "Koalitionsvertrag",
      "deutsche Wirtschaft", "Deutschlands", "Deutschland",
      "Ifo-Institut", "Wirtschaftsweise", "Sachverständigenrat",
      "Tarifvertrag", "IG Metall", "Verdi", "DGB",
      "Mittelstand", "Kurzarbeit", "Energiewende",
    ],
    accentColor: "#C9933A",
    bgColor: "#FFF4E6",
  },
  {
    id: "boerse-international",
    label: "Börsennachrichten",
    sub: "International",
    icon: "📈",
    keywords: ["S&P", "Nasdaq", "Dow Jones", "Fed", "EZB", "Zinsen", "Aktien", "Märkte", "stocks", "market", "ECB", "inflation", "recession", "Wall Street", "Ölpreis", "Gold", "Währung"],
    accentColor: "#2E7D32",
    bgColor: "#E8F5E9",
  },
  {
    id: "boerse-deutschland",
    label: "Börsennachrichten",
    sub: "Deutschland",
    icon: "🏦",
    keywords: [
      "DAX", "MDAX", "SDAX", "TecDAX", "HDAX",
      "Börse Frankfurt", "Deutsche Börse", "Xetra",
      "Deutsche Bank", "Commerzbank", "Allianz", "Munich Re", "Hannover Rück",
      "SAP", "Siemens", "Infineon", "BASF", "Bayer", "Merck",
      "Volkswagen", "BMW", "Mercedes", "Porsche", "Continental", "Schaeffler",
      "Deutsche Telekom", "Deutsche Post", "DHL",
      "RWE", "E.on", "EnBW", "Uniper",
      "Lufthansa", "Adidas", "Puma", "Henkel", "Beiersdorf",
      "Rheinmetall", "ThyssenKrupp", "Heidelberg Materials",
    ],
    accentColor: "#2E7D32",
    bgColor: "#E8F5E9",
  },
];
