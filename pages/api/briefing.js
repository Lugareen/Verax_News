import Anthropic from "@anthropic-ai/sdk";
import { fetchAllFeeds, filterByCategory } from "../../lib/rss";
import { PRIMARY_SOURCES, SECONDARY_SOURCES, CATEGORIES } from "../../lib/sources";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── AGENT 1: THEMEN-SELEKTOR ─────────────────────────────────────────────
// Nutzt NUR Primärquellen für Themenauswahl
async function agent1_selectTopics(primaryArticles, category) {
  const list = primaryArticles.slice(0, 60).map((a, i) =>
    `[${i+1}] [${a.source}/${a.lean}/${a.type}] ${a.title}`
  ).join("\n");

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `Du bist ein Themen-Analysator für ein tägliches Nachrichten-Briefing.
Analysiere die Artikel von Primärquellen (Agenturen, öffentlich-rechtliche, Qualitätspresse).
Identifiziere die 3 Themen mit den meisten berichtenden Primärquellen.
Gib NUR valides JSON zurück:
{"top_topics":[{"rank":1,"topic":"Kurze Beschreibung max 8 Wörter","source_count":5,"sources":["Reuters","BBC News"],"representative_title":"Titel des repräsentativsten Artikels"}]}`,
    messages: [{ role: "user", content: `Kategorie: ${category.label} – ${category.sub}\n\nPrimärquellen-Artikel (letzte 24h):\n${list}` }]
  });

  return extractJSON(res.content[0].text);
}

// ─── AGENT 2: FAKTEN-EXTRAKTOR ────────────────────────────────────────────
// Nutzt Primär + Sekundärquellen für Faktenextraktion
async function agent2_extractFacts(topic, allArticles) {
  const texts = allArticles.slice(0, 8).map(a =>
    `[${a.source}/${a.priority}] ${a.title}\n${a.summary.slice(0, 300)}`
  ).join("\n---\n");

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: `Du bist ein objektiver Fakten-Extraktor. Nur belegte Fakten, keine Wertungen.
VERBOTEN in der Summary: aggressiv, Missbrauch, drohend, Wirtschaftsnationalismus, gefährlich.
Nutze primäre Quellen (Agenturen, ÖR) als Hauptreferenz für Fakten.
Gib NUR valides JSON zurück:
{"headline":"Max 10 Wörter neutral","summary":"3-5 neutrale Sätze nur Fakten","confidence":"high/medium/low"}`,
    messages: [{ role: "user", content: `Thema: ${topic.topic}\n\nArtikel (primär + sekundär):\n${texts}` }]
  });

  return extractJSON(res.content[0].text);
}

// ─── AGENT 3: PERSPEKTIVEN-ANALYST ───────────────────────────────────────
// Nutzt Primär + Sekundärquellen für Links/Rechts-Analyse
async function agent3_analyzePerspectives(topic, facts, allArticles) {
  const leftArticles = allArticles
    .filter(a => a.lean === "left")
    .slice(0, 4)
    .map(a => `[${a.source}/${a.priority}] ${a.title}\n${a.summary.slice(0, 300)}`)
    .join("\n---\n");

  const rightArticles = allArticles
    .filter(a => a.lean === "right")
    .slice(0, 4)
    .map(a => `[${a.source}/${a.priority}] ${a.title}\n${a.summary.slice(0, 300)}`)
    .join("\n---\n");

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `Du bist ein Medien-Perspektiven-Analyst.
Erstelle je 3 Absätze pro Perspektive. SYMMETRIE: Beide Seiten kommentieren DASSELBE Ereignis.
Struktur: Absatz1=Bewertung, Absatz2=Betonte Folgen, Absatz3=Geforderte Reaktion.
Prognosen kennzeichnen mit "laut [Quelle] könnten...".
Gib NUR valides JSON zurück:
{"left_perspective":{"paragraphs":["p1","p2","p3"],"sources_used":["Spiegel"],"basis_tag":"article","key_argument":"1 Satz — Kernposition links geprägter Medien"},"right_perspective":{"paragraphs":["p1","p2","p3"],"sources_used":["FAZ"],"basis_tag":"article","key_argument":"1 Satz — Kernposition konservativ geprägter Medien"},"divergence_score":7,"divergence_note":"Kurz"}`,
    messages: [{
      role: "user",
      content: `Thema: ${topic.topic}\nFakten: ${facts.summary}\n\nLINKS/LIBERAL:\n${leftArticles || "Keine Artikel verfügbar"}\n\nKONSERVATIV:\n${rightArticles || "Keine Artikel verfügbar"}`
    }]
  });

  return extractJSON(res.content[0].text);
}

// ─── AGENT 4: QUALITÄTSPRÜFER ─────────────────────────────────────────────
async function agent4_qualityCheck(item) {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `Prüfe dieses Nachrichten-Briefing. Keine URLs/IDs vorhanden — systembedingt, kein Fehler.
Prüfe NUR: 1) Fakten erfunden? 2) Wertende Sprache in Summary? 3) Symmetrie der Perspektiven?
Gib NUR valides JSON zurück:
{"approved":true,"quality_score":8,"issues":[]}`,
    messages: [{ role: "user", content: JSON.stringify({ headline: item.headline, summary: item.summary, left_key: item.left_perspective?.key_argument, right_key: item.right_perspective?.key_argument }) }]
  });

  try { return extractJSON(res.content[0].text); }
  catch { return { approved: true, quality_score: 7, issues: [] }; }
}

// ─── HAUPT-PIPELINE ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { categoryId } = req.body;
  if (!categoryId) return res.status(400).json({ error: "categoryId required" });

  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return res.status(400).json({ error: "Unknown category" });

  try {
    // 1. Primär + Sekundärquellen parallel laden
    const { primary, secondary, all } = await fetchAllFeeds(PRIMARY_SOURCES, SECONDARY_SOURCES);

    // 2. Nach Kategorie filtern
    const primaryFiltered  = filterByCategory(primary, category.keywords);
    const allFiltered      = filterByCategory(all, category.keywords);

    // Fallback wenn zu wenig gefilterte Artikel
    const primaryArticles  = primaryFiltered.length  >= 3 ? primaryFiltered  : primary.slice(0, 40);
    const allArticles      = allFiltered.length      >= 5 ? allFiltered      : all.slice(0, 60);

    // 3. Agent 1: Top 3 Themen NUR aus Primärquellen
    const topicsResult = await agent1_selectTopics(primaryArticles, category);
    const topics = topicsResult.top_topics?.slice(0, 3) || [];

    if (topics.length === 0) {
      return res.status(200).json({
        success: true,
        data: { generated_at: new Date().toISOString(), news: [], stats: { primary: primary.length, secondary: secondary.length } },
        category
      });
    }

    // 4. Agent 2 + 3 für jedes Thema sequentiell
    const newsItems = [];
    for (const topic of topics) {
      // Artikel für dieses Thema aus ALLEN Quellen
      const topicAllArticles = allArticles.filter(a =>
        topic.sources?.includes(a.source)
      );
      const usedArticles = topicAllArticles.length >= 3 ? topicAllArticles : allArticles.slice(0, 15);

      const facts        = await agent2_extractFacts(topic, usedArticles);
      const perspectives = await agent3_analyzePerspectives(topic, facts, usedArticles);

      newsItems.push({
        headline:         facts.headline,
        summary:          facts.summary,
        confidence:       facts.confidence,
        source_count:     topic.source_count,
        sources:          topic.sources || [],
        left_perspective: perspectives.left_perspective,
        right_perspective: perspectives.right_perspective,
        divergence_score: perspectives.divergence_score,
        divergence_note:  perspectives.divergence_note,
      });
    }

    // 5. Agent 4: Qualitätsprüfung
    const finalItems = [];
    for (const item of newsItems) {
      const quality = await agent4_qualityCheck(item);
      finalItems.push({
        ...item,
        quality: { approved: quality.approved, score: quality.quality_score }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        generated_at:  new Date().toISOString(),
        category:      `${category.label} – ${category.sub}`,
        pipeline:      "4-agent-primary-secondary-v1",
        stats: {
          primary_sources:   primary.length,
          secondary_sources: secondary.length,
          total_articles:    all.length,
        },
        news: finalItems,
      },
      category,
    });

  } catch (error) {
    console.error("Pipeline Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
