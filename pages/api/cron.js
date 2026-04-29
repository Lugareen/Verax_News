import Anthropic from "@anthropic-ai/sdk";
import { put, list } from "@vercel/blob";
import { fetchAllFeeds, filterByCategory } from "../../lib/rss";
import { PRIMARY_SOURCES, SECONDARY_SOURCES, CATEGORIES } from "../../lib/sources";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text) {
  // Cite-Tags entfernen die Web Search einfügt
  const noCites = text.replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "");
  const clean = noCites.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  throw new Error("Kein valides JSON gefunden");
}

// Cite-Tags aus Artikel-Text entfernen
function stripCites(text) {
  if (!text) return text;
  return text.replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "").trim();
}

// Rate Limit Retry Helper
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && attempt < maxRetries) {
        const wait = attempt * 15000; // 15s, 30s, 45s
        console.log(`Rate limit — warte ${wait/1000}s (Versuch ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

async function agent1_selectTopics(primaryArticles, category) {
  const list = primaryArticles.slice(0, 40).map((a, i) =>
    `[${i+1}] [${a.source}] ${a.title}`
  ).join("\n");
  const res = await withRetry(() => client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: `Du bist ein Themen-Analysator für ein tägliches Nachrichten-Briefing.
Identifiziere die 3 wichtigsten und meistberichteten Themen für die Kategorie: "${category.label} – ${category.sub}".

DIVERSITÄTS-REGEL — KRITISCH:
Die 3 Themen müssen UNTERSCHIEDLICHE Ereignisse sein — verschiedene Länder, Schauplätze, Akteure.
NIEMALS 2 Themen zum selben Konflikt oder Land wählen.
Wähle die geografisch und thematisch vielfältigsten Top-Themen.
Beispiel FALSCH: Iran-Blockade + Iran-Krieg (beides Iran)
Beispiel RICHTIG: Iran-Blockade + Ukraine-Krieg + Handelspolitik

${category.id.includes("deutschland") ? `
DEUTSCHLAND-REGEL: Nur Themen bei denen Deutschland das HAUPTTHEMA ist.
✅ Innenpolitik, deutsche Unternehmen, direkte DE-Auswirkungen
❌ Internationale Themen die Deutschland nur am Rande erwähnen
` : ""}

${category.id.includes("boerse") ? `
NUR: Börsenkurse, Quartalsberichte, Fusionen, Übernahmen, Dividenden.
${category.id === "boerse-deutschland" ? "Fokus: DAX, MDAX, SDAX Unternehmen." : ""}
` : ""}

QUELLEN-FORMAT: Nenne nur den Mediennamen (z.B. "Tagesschau", "BBC") — kein "Liveblog", "Teaser" etc.

Gib NUR valides JSON zurück:
{"top_topics":[{"rank":1,"topic":"Max 8 Wörter auf DEUTSCH","source_count":5,"sources":["BBC","Tagesschau"],"representative_title":"Titel"}]}`,
    messages: [{ role: "user", content: `Kategorie: ${category.label} – ${category.sub}\n\nArtikel:\n${list}` }]
  }));
  return extractJSON(res.content[0].text);
}

async function agent2_extractFacts(topic, allArticles) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  // Bevorzuge Artikel mit Volltext
  const sorted = [...allArticles].sort((a, b) => (b.hasFullText ? 1 : 0) - (a.hasFullText ? 1 : 0));
  const fulltextCount = allArticles.filter(a => a.hasFullText).length;
  const texts = sorted.slice(0, 8).map(a =>
    `[${a.source}${a.hasFullText ? "/VOLLTEXT" : "/TEASER"}]\nTitel: ${a.title}\nInhalt: ${a.summary.slice(0, 400)}`
  ).join("\n---\n");

  const res = await withRetry(() => client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `Du bist ein streng objektiver Fakten-Extraktor. (Datum: ${today})

ABSOLUTE GRUNDREGEL:
Schreibe AUSSCHLIESSLICH was in den bereitgestellten Artikeln steht.
Trainingswissen ist VERBOTEN.
Lieber kürzer und akkurat als länger mit erfundenen Details.

SPRACHE: Headline und Summary IMMER auf Deutsch — auch wenn Quellen englisch sind.
QUELLEN: Nenne nur den Mediennamen (z.B. "Tagesschau", "BBC News") — kein "Liveblog", "Teaser", "Bericht" etc.

VERBOTEN:
- Wertende Adjektive: aggressiv, drohend, gefährlich
- Koalitionsnamen ohne Beleg: Ampel-Regierung
- Spekulationen die nicht in Artikeln stehen

Gib NUR valides JSON zurück mit den Feldern: headline, summary, confidence.`,
    messages: [{ role: "user", content: `Thema: ${topic.topic}\nVerfügbar: ${fulltextCount} Volltexte, ${allArticles.length - fulltextCount} Teaser\n\nArtikel:\n${texts}` }]
  }));
  return extractJSON(res.content[0].text);
}

async function fetchArticleFulltext(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VeraxNews/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const patterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];
    let raw = "";
    for (const p of patterns) {
      const m = html.match(p);
      if (m) { raw = m[1]; break; }
    }
    if (!raw) raw = html;
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    return text.length > 200 ? text : null;
  } catch { return null; }
}

async function agent3_analyzePerspectives(topic, facts, allArticles) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  // Option 2: Volltext nachladen für RSS-Artikel
  const leftRSS = allArticles.filter(a => a.lean === "left").slice(0, 2);
  const rightRSS = allArticles.filter(a => a.lean === "right").slice(0, 2);

  const enriched = async (articles) => Promise.all(articles.map(async a => {
    if (a.hasFullText) return a;
    if (a.link) {
      const ft = await fetchArticleFulltext(a.link);
      if (ft) return { ...a, summary: ft, hasFullText: true };
    }
    return a;
  }));

  const [leftEnriched, rightEnriched] = await Promise.all([
    enriched(leftRSS), enriched(rightRSS)
  ]);

  const leftArticles = leftEnriched
    .map(a => `[${a.source}] ${a.title}`)
    .join("\n");

  const rightArticles = rightEnriched
    .map(a => `[${a.source}] ${a.title}`)
    .join("\n");

  // Option 1: Pflicht-Suchanfragen — garantiert beide Seiten
  const isGerman = allArticles.some(a => a.country === "de") ||
    ["deutschland", "boerse-deutschland"].includes(topic.category_id);
  const leftQuery = isGerman
    ? `${topic.topic} Spiegel OR taz OR Süddeutsche OR Zeit`
    : `${topic.topic} Guardian OR "New York Times" OR NPR`;
  const rightQuery = isGerman
    ? `${topic.topic} FAZ OR Welt OR NZZ OR Focus`
    : `${topic.topic} WSJ OR Telegraph OR "Washington Examiner"`;

  const res = await withRetry(() => client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    system: `Du bist ein Medien-Perspektiven-Analyst. (Datum: ${today})

PFLICHTSUCHEN — führe BEIDE aus:
1. Links-Suche:       "${leftQuery}"
2. Konservativ-Suche: "${rightQuery}"
Danach optional 1-2 weitere Suchen.

SCHREIBSTIL — ABSOLUT KRITISCH:
Schreibe DIREKT im Stil der Medien — nicht ÜBER sie.
VERBOTEN: "würden", "typischerweise", "in der Regel", "dürfte"
RICHTIG: direkte Aussagen aus echten Artikeln, echte Zitate

QUELLENREGELN:
Links:      Spiegel, taz, SZ, Guardian, NYT, Washington Post, NPR, Zeit, Le Monde
Konservativ: FAZ, Welt, NZZ, Focus, Cicero, WSJ, Telegraph, Washington Examiner
Guardian ist IMMER links — niemals konservativ.

ABSÄTZE: 2-3 wenn echte Artikel gefunden, 1-2 wenn nur Snippets
basis_tag = "article" wenn Artikel gefunden, "knowledge" wenn nicht

WICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt.
Kein Text davor, kein Text danach, keine Erklärungen.
Gib NUR valides JSON zurück:
{"left_perspective":{"paragraphs":["p1","p2"],"sources_used":["Spiegel"],"basis_tag":"article","key_argument":"1 Satz"},"right_perspective":{"paragraphs":["p1","p2"],"sources_used":["FAZ"],"basis_tag":"article","key_argument":"1 Satz"},"divergence_score":7,"divergence_note":"Kurz"}`,
    messages: [{
      role: "user",
      content: `Thema: ${topic.topic}\nDatum: ${today}\nFakten: ${facts.summary}\n\nRSS Links:\n${leftArticles || "Keine"}\n\nRSS Konservativ:\n${rightArticles || "Keine"}\n\nFühre jetzt die Pflichtsuchen durch.`
    }]
  }));

  // Web Search Antwort verarbeiten — suche letzten Text-Block mit JSON
  const textBlocks = res.content.filter(b => b.type === "text");
  const searchBlocks = res.content.filter(b => b.type === "tool_use");
  if (searchBlocks.length > 0) {
    console.log(`Web Search (${searchBlocks.length}x): ${searchBlocks.map(b => b.input?.query).join(" | ")}`);
  }

  // Finde den Text-Block der JSON enthält
  let lastText = "";
  for (const block of [...textBlocks].reverse()) {
    if (block.text && block.text.includes('"left_perspective"')) {
      lastText = block.text;
      break;
    }
  }
  // Fallback: letzter Text-Block
  if (!lastText && textBlocks.length > 0) {
    lastText = textBlocks[textBlocks.length - 1].text || "";
  }
  console.log(`Agent3 output length: ${lastText.length} chars`);
  try {
    return extractJSON(lastText);
  } catch {
    console.error("Agent3 JSON Fehler. Raw output:", lastText.slice(0, 500));
    return {
      left_perspective: { paragraphs: ["Keine Analyse verfügbar."], sources_used: [], basis_tag: "knowledge", key_argument: "" },
      right_perspective: { paragraphs: ["Keine Analyse verfügbar."], sources_used: [], basis_tag: "knowledge", key_argument: "" },
      divergence_score: 0,
      divergence_note: "Fehler bei der Analyse"
    };
  }
}

async function agent4_qualityCheck(item) {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `Prüfe dieses Nachrichten-Briefing. Keine URLs/IDs — systembedingt, kein Fehler.
Prüfe auf folgende Probleme:
1) Fakten erfunden die nicht in Quellen stehen?
2) Wertende Sprache in der Summary?
3) Symmetrie der Perspektiven?
4) VERALTETE POLITISCHE BEGRIFFE: Werden Begriffe wie "Ampel-Regierung", "Ampel-Koalition",
   "Scholz-Regierung" verwendet ohne dass diese explizit in den Artikeln stehen?
   Das ist ein kritischer Fehler da diese Regierung nicht mehr im Amt ist.
Gib NUR valides JSON zurück:
{"approved":true,"quality_score":8,"issues":[]}`,
    messages: [{ role: "user", content: JSON.stringify({ headline: item.headline, summary: item.summary, left_key: item.left_perspective?.key_argument, right_key: item.right_perspective?.key_argument }) }]
  });
  try { return extractJSON(res.content[0].text); }
  catch { return { approved: true, quality_score: 7, issues: [] }; }
}

async function generateCategoryBriefing(category, primary, secondary, all) {
  const primaryFiltered = filterByCategory(primary, category.keywords);
  const allFiltered = filterByCategory(all, category.keywords);
  const primaryArticles = primaryFiltered.length >= 3 ? primaryFiltered : primary.slice(0, 25);
  const allArticles = allFiltered.length >= 5 ? allFiltered : all.slice(0, 35);

  const topicsResult = await agent1_selectTopics(primaryArticles, category);
  const topics = topicsResult.top_topics?.slice(0, 2) || [];
  if (topics.length === 0) return { generated_at: new Date().toISOString(), news: [] };

  const newsItems = [];
  for (const topic of topics) {
    const topicArticles = allArticles.filter(a => topic.sources?.includes(a.source));
    const usedArticles = topicArticles.length >= 3 ? topicArticles : allArticles.slice(0, 12);
    const facts = await agent2_extractFacts(topic, usedArticles);

    // ── QUALITÄTS-GATE ───────────────────────────────────────────────────
    const noMaterial = !facts.summary ||
      facts.summary.toLowerCase().includes("keine informationen verfügbar") ||
      facts.summary.toLowerCase().includes("no information available") ||
      facts.summary.length < 50;

    if (noMaterial) {
      console.log(`⚠️ Überspringe "${topic.topic}" — kein Material`);
      continue;
    }
    // ─────────────────────────────────────────────────────────────────────

    // Pause zwischen Themen um Rate Limit zu vermeiden
    await new Promise(r => setTimeout(r, 20000));

    const perspectives = await agent3_analyzePerspectives(topic, facts, usedArticles);
    newsItems.push({
      headline: facts.headline,
      summary: facts.summary,
      confidence: facts.confidence,
      source_count: topic.source_count,
      sources: topic.sources || [],
      actual_sources: {
        left:    [...new Set(usedArticles.filter(a => a.lean === "left").map(a => a.source))],
        right:   [...new Set(usedArticles.filter(a => a.lean === "right").map(a => a.source))],
        neutral: [...new Set(usedArticles.filter(a => a.lean === "neutral").map(a => a.source))],
      },
        left_perspective: {
          ...perspectives.left_perspective,
          paragraphs: perspectives.left_perspective?.paragraphs?.map(stripCites) || [],
        },
        right_perspective: {
          ...perspectives.right_perspective,
          paragraphs: perspectives.right_perspective?.paragraphs?.map(stripCites) || [],
        },
        divergence_score: perspectives.divergence_score,
        divergence_note: perspectives.divergence_note,
    });
  }

  // Agent 4 sequentiell
  const checkedItems = [];
  for (const item of newsItems) {
    const quality = await agent4_qualityCheck(item);
    checkedItems.push({ ...item, quality: { approved: quality.approved, score: quality.quality_score } });
  }

  return {
    generated_at: new Date().toISOString(),
    category: `${category.label} – ${category.sub}`,
    news: checkedItems,
  };
}

// ─── CRON HANDLER ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vercel Cron authentifiziert automatisch — manueller Aufruf braucht Secret
  const authHeader = req.headers["authorization"];
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Einzelne Kategorie (via Query-Parameter) oder alle
  const { categoryId } = req.query;
  const categoriesToRun = categoryId
    ? CATEGORIES.filter(c => c.id === categoryId)
    : CATEGORIES;

  if (categoriesToRun.length === 0) {
    return res.status(400).json({ error: `Unbekannte Kategorie: ${categoryId}` });
  }

  console.log(`Cron gestartet: ${categoriesToRun.map(c => c.id).join(", ")}`);

  try {
    const { primary, secondary, all } = await fetchAllFeeds(PRIMARY_SOURCES, SECONDARY_SOURCES);
    console.log(`Feeds: ${primary.length} primär, ${secondary.length} sekundär`);

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    for (const category of categoriesToRun) {
      console.log(`Generiere: ${category.id}`);
      try {
        const briefing = await generateCategoryBriefing(category, primary, secondary, all);
        await put(
          `briefings/briefing-${category.id}-${today}.json`,
          JSON.stringify(briefing),
          { access: "public", contentType: "application/json", allowOverwrite: true }
        );
        results.push({ id: category.id, status: "ok" });
        console.log(`✅ ${category.id}`);
      } catch (err) {
        results.push({ id: category.id, status: "error", error: err.message });
        console.error(`❌ ${category.id}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      date: today,
      categories: results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { maxDuration: 300 };
