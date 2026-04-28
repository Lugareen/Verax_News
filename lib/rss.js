import Parser from "rss-parser";

const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; VeraxNews/1.0)" },
});

// ─── VOLLTEXT-ABRUF ───────────────────────────────────────────────────────
// Ruft den kompletten Artikeltext ab wenn möglich
// Quellen die zuverlässig funktionieren (keine Paywall)
const FULLTEXT_SUPPORTED = new Set([
  "Reuters", "BBC News", "BBC News World", "The Guardian", "Al Jazeera",
  "Deutsche Welle", "Tagesschau", "ZDF", "Deutschlandfunk", "NPR",
  "taz", "Zeit Online", "Frankfurter Rundschau", "Berliner Zeitung",
  "Der Standard", "The Independent", "Politico Europe", "AP News",
  "n-tv", "BR Nachrichten", "MDR Nachrichten",
]);

async function fetchFullText(url, sourceName) {
  if (!FULLTEXT_SUPPORTED.has(sourceName)) return null;
  if (!url) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VeraxNews/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extrahiere Text aus bekannten Artikel-Strukturen
    const patterns = [
      // Article body patterns
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*(?:article|content|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];

    let rawText = "";
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) { rawText = match[1]; break; }
    }

    if (!rawText) rawText = html;

    // HTML Tags entfernen und Text bereinigen
    const text = rawText
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000); // Max 1000 Zeichen im RSS-Pass

    return text.length > 100 ? text : null;
  } catch (e) {
    return null; // Kein Fehler werfen — Teaser als Fallback
  }
}

// ─── FEED FETCHER ─────────────────────────────────────────────────────────
async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const items = feed.items
      .filter(item => !item.pubDate || new Date(item.pubDate).getTime() > oneDayAgo)
      .slice(0, 5); // Max 5 statt 8 pro Quelle

    // Volltext für bis zu 2 Artikel pro Quelle
    const articles = await Promise.all(items.map(async (item, idx) => {
      const fullText = idx < 2
        ? await fetchFullText(item.link, source.name)
        : null;

      const teaser = (item.contentSnippet || item.description || "").slice(0, 400);
      const content = fullText || teaser;

      return {
        title: item.title || "",
        summary: content,
        teaser: teaser,
        hasFullText: !!fullText,
        link: item.link || "",
        pubDate: item.pubDate || "",
        source: source.name,
        lean: source.lean,
        type: source.type,
        country: source.country,
        priority: source.priority,
      };
    }));

    const withFullText = articles.filter(a => a.hasFullText).length;
    if (withFullText > 0) {
      console.log(`${source.name}: ${withFullText}/${articles.length} Artikel mit Volltext`);
    }

    return articles;
  } catch (e) {
    console.error(`Feed error ${source.name}:`, e.message);
    return [];
  }
}

// ─── FEED LOADER ──────────────────────────────────────────────────────────
export async function fetchPrimaryFeeds(primarySources) {
  const tagged = primarySources.map(s => ({ ...s, priority: "primary" }));
  const results = await Promise.allSettled(tagged.map(s => fetchFeed(s)));
  const articles = [];
  results.forEach(r => { if (r.status === "fulfilled") articles.push(...r.value); });
  const withFullText = articles.filter(a => a.hasFullText).length;
  console.log(`Primärquellen: ${articles.length} Artikel (${withFullText} mit Volltext)`);
  return articles;
}

export async function fetchSecondaryFeeds(secondarySources) {
  const tagged = secondarySources.map(s => ({ ...s, priority: "secondary" }));
  const results = await Promise.allSettled(tagged.map(s => fetchFeed(s)));
  const articles = [];
  results.forEach(r => { if (r.status === "fulfilled") articles.push(...r.value); });
  const withFullText = articles.filter(a => a.hasFullText).length;
  console.log(`Sekundärquellen: ${articles.length} Artikel (${withFullText} mit Volltext)`);
  return articles;
}

export async function fetchAllFeeds(primarySources, secondarySources) {
  const [primary, secondary] = await Promise.all([
    fetchPrimaryFeeds(primarySources),
    fetchSecondaryFeeds(secondarySources),
  ]);
  return { primary, secondary, all: [...primary, ...secondary] };
}

// ─── FILTER & CLUSTER ─────────────────────────────────────────────────────
export function filterByCategory(articles, keywords) {
  return articles.filter(a => {
    const text = `${a.title} ${a.summary}`.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}

function extractKeywords(title) {
  const stopwords = new Set([
    "der","die","das","ein","eine","und","oder","für","mit","von","zu","in","an","auf",
    "ist","sind","hat","haben","wird","werden","the","a","an","and","or","for","in",
    "on","is","are","has","have","will","to","of","with","as","by","at","from","that"
  ]);
  return title.toLowerCase()
    .replace(/[^a-zäöüß\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));
}

function titleSimilarity(t1, t2) {
  const w1 = new Set(extractKeywords(t1));
  const w2 = new Set(extractKeywords(t2));
  if (w1.size === 0 || w2.size === 0) return 0;
  const intersection = [...w1].filter(w => w2.has(w));
  return intersection.length / Math.max(w1.size, w2.size);
}

export function clusterAndRankTopics(primaryArticles) {
  const clusters = [];
  for (const article of primaryArticles) {
    let added = false;
    for (const cluster of clusters) {
      if (titleSimilarity(article.title, cluster.representative) >= 0.25) {
        cluster.articles.push(article);
        cluster.primarySources.add(article.source);
        cluster.count = cluster.primarySources.size;
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({
        representative: article.title,
        articles: [article],
        primarySources: new Set([article.source]),
        count: 1,
      });
    }
  }
  return clusters
    .sort((a, b) => b.count - a.count)
    .map(c => ({ ...c, primarySources: [...c.primarySources] }));
}
