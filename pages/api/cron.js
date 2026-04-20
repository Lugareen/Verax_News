import Anthropic from "@anthropic-ai/sdk";
import { put, list } from "@vercel/blob";
import { fetchAllFeeds, filterByCategory } from "../../lib/rss";
import { PRIMARY_SOURCES, SECONDARY_SOURCES, CATEGORIES } from "../../lib/sources";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function agent1_selectTopics(primaryArticles, category) {
  const list = primaryArticles.slice(0, 60).map((a, i) =>
    `[${i+1}] [${a.source}/${a.lean}/${a.type}] ${a.title}`
  ).join("\n");
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `Du bist ein Themen-Analysator für ein tägliches Nachrichten-Briefing.
Identifiziere die 3 Themen mit den meisten berichtenden Primärquellen für die Kategorie: "${category.label} – ${category.sub}".

${category.id.includes("deutschland") ? `
ENTSCHEIDUNGSREGEL FÜR DEUTSCHLAND-KATEGORIEN:
Wähle ein Thema NUR wenn Deutschland das HAUPTTHEMA ist — nicht nur eine Randerwähnung.

✅ Deutschland ist Hauptthema wenn:
- Es um deutsche Innenpolitik geht (Bundestag, Parteien, Regierung)
- Ein deutsches Unternehmen im Mittelpunkt steht
- Eine internationale Entscheidung DIREKT und PRIMÄR Deutschland betrifft
  (z.B. "EZB-Zinsen belasten deutschen Immobilienmarkt" → ✅)
  (z.B. "EZB erhöht Zinsen" ohne DE-Bezug → ❌ gehört zu International)

❌ Deutschland ist NICHT Hauptthema wenn:
- Ein internationales Ereignis nur nebenbei Deutschland erwähnt
- Es um globale Politik/Wirtschaft geht bei der Deutschland eine von vielen Nationen ist
` : ""}

${category.id.includes("boerse") ? `
NUR Themen zu: Börsenkursen, Unternehmensgewinnen/-verlusten, Zinsentscheidungen, Marktbewegungen.
KEINE allgemeinen Wirtschafts- oder Politiknachrichten.
` : ""}

Gib NUR valides JSON zurück:
{"top_topics":[{"rank":1,"topic":"Kurze Beschreibung max 8 Wörter","source_count":5,"sources":["Reuters","BBC News"],"representative_title":"Titel"}]}`,
    messages: [{ role: "user", content: `Kategorie: ${category.label} – ${category.sub}\n\nPrimärquellen-Artikel (letzte 24h):\n${list}` }]
  });
  return extractJSON(res.content[0].text);
}

async function agent2_extractFacts(topic, allArticles) {
  const texts = allArticles.slice(0, 8).map(a =>
    `[${a.source}/${a.priority}] ${a.title}\n${a.summary.slice(0, 300)}`
  ).join("\n---\n");
  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: `Du bist ein objektiver Fakten-Extraktor. Nur belegte Fakten, keine Wertungen.
VERBOTEN: aggressiv, Missbrauch, drohend, Wirtschaftsnationalismus, gefährlich.
Gib NUR valides JSON zurück:
{"headline":"Max 10 Wörter neutral","summary":"3-5 neutrale Sätze","confidence":"high/medium/low"}`,
    messages: [{ role: "user", content: `Thema: ${topic.topic}\n\nArtikel:\n${texts}` }]
  });
  return extractJSON(res.content[0].text);
}

async function agent3_analyzePerspectives(topic, facts, allArticles) {
  const leftArticles = allArticles.filter(a => a.lean === "left").slice(0, 4)
    .map(a => `[${a.source}/${a.priority}] ${a.title}\n${a.summary.slice(0, 300)}`).join("\n---\n");
  const rightArticles = allArticles.filter(a => a.lean === "right").slice(0, 4)
    .map(a => `[${a.source}/${a.priority}] ${a.title}\n${a.summary.slice(0, 300)}`).join("\n---\n");
  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `Du bist ein Medien-Perspektiven-Analyst.
Je 3 Absätze pro Perspektive. SYMMETRIE: Beide Seiten kommentieren DASSELBE Ereignis.
Struktur: Absatz1=Bewertung, Absatz2=Betonte Folgen, Absatz3=Geforderte Reaktion.
Prognosen kennzeichnen mit "laut [Quelle] könnten...".
Gib NUR valides JSON zurück:
{"left_perspective":{"paragraphs":["p1","p2","p3"],"sources_used":["Spiegel"],"basis_tag":"article","key_argument":"1 Satz"},"right_perspective":{"paragraphs":["p1","p2","p3"],"sources_used":["FAZ"],"basis_tag":"article","key_argument":"1 Satz"},"divergence_score":7,"divergence_note":"Kurz"}`,
    messages: [{
      role: "user",
      content: `Thema: ${topic.topic}\nFakten: ${facts.summary}\n\nLINKS:\n${leftArticles || "Keine Artikel"}\n\nKONSERVATIV:\n${rightArticles || "Keine Artikel"}`
    }]
  });
  return extractJSON(res.content[0].text);
}

async function agent4_qualityCheck(item) {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `Prüfe dieses Briefing. Keine URLs/IDs — systembedingt, kein Fehler.
Prüfe NUR: 1) Fakten erfunden? 2) Wertende Sprache? 3) Symmetrie?
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
  const primaryArticles = primaryFiltered.length >= 3 ? primaryFiltered : primary.slice(0, 40);
  const allArticles = allFiltered.length >= 5 ? allFiltered : all.slice(0, 60);

  const topicsResult = await agent1_selectTopics(primaryArticles, category);
  const topics = topicsResult.top_topics?.slice(0, 3) || [];
  if (topics.length === 0) return { generated_at: new Date().toISOString(), news: [] };

  const newsItems = await Promise.all(
    topics.map(async (topic) => {
      const topicArticles = allArticles.filter(a => topic.sources?.includes(a.source));
      const usedArticles = topicArticles.length >= 3 ? topicArticles : allArticles.slice(0, 12);
      const facts = await agent2_extractFacts(topic, usedArticles);
      const perspectives = await agent3_analyzePerspectives(topic, facts, usedArticles);
      return {
        headline: facts.headline,
        summary: facts.summary,
        confidence: facts.confidence,
        source_count: topic.source_count,
        sources: topic.sources || [],
        left_perspective: perspectives.left_perspective,
        right_perspective: perspectives.right_perspective,
        divergence_score: perspectives.divergence_score,
        divergence_note: perspectives.divergence_note,
      };
    })
  );

  // Agent 4 parallel
  const checkedItems = await Promise.all(
    newsItems.map(async (item) => {
      const quality = await agent4_qualityCheck(item);
      return { ...item, quality: { approved: quality.approved, score: quality.quality_score } };
    })
  );

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
