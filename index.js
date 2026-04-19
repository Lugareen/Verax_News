import Parser from "rss-parser";

const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; VeraxNews/1.0)" },
});

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return feed.items
      .filter(item => !item.pubDate || new Date(item.pubDate).getTime() > oneDayAgo)
      .slice(0, 8) // 8 Artikel pro Quelle
      .map(item => ({
        title: item.title || "",
        summary: (item.contentSnippet || item.description || "").slice(0, 400),
        link: item.link || "",
        pubDate: item.pubDate || "",
        source: source.name,
        lean: source.lean,
        type: source.type,
        country: source.country,
        priority: source.priority,
      }));
  } catch (e) {
    console.error(`Feed error ${source.name}:`, e.message);
    return [];
  }
}

// Primärquellen laden (für Themenauswahl)
export async function fetchPrimaryFeeds(primarySources) {
  const tagged = primarySources.map(s => ({ ...s, priority: "primary" }));
  const results = await Promise.allSettled(tagged.map(s => fetchFeed(s)));
  const articles = [];
  results.forEach(r => { if (r.status === "fulfilled") articles.push(...r.value); });
  console.log(`Primärquellen: ${articles.length} Artikel geladen`);
  return articles;
}

// Sekundärquellen laden (für Inhaltsanalyse)
export async function fetchSecondaryFeeds(secondarySources) {
  const tagged = secondarySources.map(s => ({ ...s, priority: "secondary" }));
  const results = await Promise.allSettled(tagged.map(s => fetchFeed(s)));
  const articles = [];
  results.forEach(r => { if (r.status === "fulfilled") articles.push(...r.value); });
  console.log(`Sekundärquellen: ${articles.length} Artikel geladen`);
  return articles;
}

// Alle Quellen laden
export async function fetchAllFeeds(primarySources, secondarySources) {
  const [primary, secondary] = await Promise.all([
    fetchPrimaryFeeds(primarySources),
    fetchSecondaryFeeds(secondarySources),
  ]);
  return { primary, secondary, all: [...primary, ...secondary] };
}

// Artikel nach Kategorie-Keywords filtern
export function filterByCategory(articles, keywords) {
  return articles.filter(a => {
    const text = `${a.title} ${a.summary}`.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}

// Keywords aus Titel extrahieren
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

// Ähnlichkeit zwischen zwei Titeln berechnen
function titleSimilarity(t1, t2) {
  const w1 = new Set(extractKeywords(t1));
  const w2 = new Set(extractKeywords(t2));
  if (w1.size === 0 || w2.size === 0) return 0;
  const intersection = [...w1].filter(w => w2.has(w));
  return intersection.length / Math.max(w1.size, w2.size);
}

// Themen clustern und nach Häufigkeit in Primärquellen ranken
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
