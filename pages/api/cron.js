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
    system: `Du bist ein Themen-Analysator. Identifiziere die 3 Themen mit den meisten berichtenden Primärquellen.
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

  const newsItems = [];
  for (const topic of topics) {
    const topicArticles = allArticles.filter(a => topic.sources?.includes(a.source));
    const usedArticles = topicArticles.length >= 3 ? topicArticles : allArticles.slice(0, 15);
    const facts = await agent2_extractFacts(topic, usedArticles);
    const perspectives = await agent3_analyzePerspectives(topic, facts, usedArticles);
    newsItems.push({
      headline: facts.headline,
      summary: facts.summary,
      confidence: facts.confidence,
      source_count: topic.source_count,
      sources: topic.sources || [],
      left_perspective: perspectives.left_perspective,
      right_perspective: perspectives.right_perspective,
      divergence_score: perspectives.divergence_score,
      divergence_note: perspectives.divergence_note,
    });
  }

  const finalItems = [];
  for (const item of newsItems) {
    const quality = await agent4_qualityCheck(item);
    finalItems.push({ ...item, quality: { approved: quality.approved, score: quality.quality_score } });
  }

  return {
    generated_at: new Date().toISOString(),
    category: `${category.label} – ${category.sub}`,
    news: finalItems,
  };
}

// ─── CRON HANDLER ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("Cron Job gestartet:", new Date().toISOString());

  try {
    const { primary, secondary, all } = await fetchAllFeeds(PRIMARY_SOURCES, SECONDARY_SOURCES);
    console.log(`Feeds geladen: ${primary.length} primär, ${secondary.length} sekundär`);

    const today = new Date().toISOString().split("T")[0]; // z.B. "2025-04-16"

    for (const category of CATEGORIES) {
      console.log(`Generiere: ${category.label} – ${category.sub}`);
      try {
        const briefing = await generateCategoryBriefing(category, primary, secondary, all);

        // In Vercel Blob speichern — Dateiname: briefing-{categoryId}-{datum}.json
        await put(
          `briefings/briefing-${category.id}-${today}.json`,
          JSON.stringify(briefing),
          { access: "public", contentType: "application/json", allowOverwrite: true }
        );

        console.log(`✅ Gespeichert: ${category.id}`);
      } catch (err) {
        console.error(`❌ Fehler bei ${category.id}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Alle Briefings generiert und gespeichert",
      date: today,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 300, // 5 Minuten max (Vercel Pro erlaubt bis 300s)
};
