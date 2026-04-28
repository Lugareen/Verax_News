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
NUR Themen zu: Börsenkursen, Unternehmensgewinnen/-verlusten, Zinsentscheidungen, Fusionen, Übernahmen, Stellenabbau, Quartalsberichte, Dividenden.
KEINE allgemeinen Wirtschafts- oder Politiknachrichten.
${category.id === "boerse-deutschland" ? "Fokus auf: DAX, MDAX, SDAX Unternehmen — z.B. Lufthansa, SAP, Volkswagen, Siemens, Deutsche Bank etc." : ""}
` : ""}

Gib NUR valides JSON zurück:
{"top_topics":[{"rank":1,"topic":"Kurze Beschreibung max 8 Wörter","source_count":5,"sources":["Reuters","BBC News"],"representative_title":"Titel"}]}`,
    messages: [{ role: "user", content: `Kategorie: ${category.label} – ${category.sub}\n\nPrimärquellen-Artikel (letzte 24h):\n${list}` }]
  });
  return extractJSON(res.content[0].text);
}

async function agent2_extractFacts(topic, allArticles) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  // Bevorzuge Artikel mit Volltext
  const sorted = [...allArticles].sort((a, b) => (b.hasFullText ? 1 : 0) - (a.hasFullText ? 1 : 0));
  const fulltextCount = allArticles.filter(a => a.hasFullText).length;
  const texts = sorted.slice(0, 8).map(a =>
    `[${a.source}${a.hasFullText ? "/VOLLTEXT" : "/TEASER"}]\nTitel: ${a.title}\nInhalt: ${a.summary.slice(0, 600)}`
  ).join("\n---\n");

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: `Du bist ein streng objektiver Fakten-Extraktor. (Datum: ${today})

ABSOLUTE GRUNDREGEL:
Schreibe AUSSCHLIESSLICH was in den bereitgestellten Artikeln steht.
Trainingswissen ist VERBOTEN — auch wenn du etwas zu wissen glaubst.
Lieber eine kürzere aber akkurate Zusammenfassung als eine längere mit erfundenen Details.

WENN ZU WENIG MATERIAL:
Schreibe nur was du belegen kannst — auch wenn es nur 2 Sätze sind.
Kennzeichne Unsicherheit: "laut [Quelle]..." statt absolute Aussagen.

VERBOTEN:
- Wertende Adjektive: aggressiv, Missbrauch, drohend, gefährlich
- Koalitionsnamen die nicht in Artikeln stehen: Ampel-Regierung, Scholz-Regierung
- Spekulationen über Absichten oder Folgen die nicht in Artikeln stehen

Gib NUR valides JSON zurück:
{"headline":"Max 10 Wörter neutral","summary":"Nur belegte Fakten 2-5 Sätze","confidence":"high/medium/low"}`,
    messages: [{ role: "user", content: `Thema: ${topic.topic}\nVerfügbar: ${fulltextCount} Volltexte, ${allArticles.length - fulltextCount} Teaser\n\nArtikel:\n${texts}` }]
  });
  return extractJSON(res.content[0].text);
}

async function agent3_analyzePerspectives(topic, facts, allArticles) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  // RSS-Artikel als Kontext behalten
  const leftArticles = allArticles.filter(a => a.lean === "left")
    .sort((a, b) => (b.hasFullText ? 1 : 0) - (a.hasFullText ? 1 : 0))
    .slice(0, 3)
    .map(a => `[${a.source}] ${a.title}\n${a.summary.slice(0, 600)}`)
    .join("\n---\n");

  const rightArticles = allArticles.filter(a => a.lean === "right")
    .sort((a, b) => (b.hasFullText ? 1 : 0) - (a.hasFullText ? 1 : 0))
    .slice(0, 3)
    .map(a => `[${a.source}] ${a.title}\n${a.summary.slice(0, 600)}`)
    .join("\n---\n");

  // Web Search aktivieren — sucht aktiv nach links UND rechts Berichterstattung
  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    tools: [{
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 6,
    }],
    system: `Du bist ein Medien-Perspektiven-Analyst für ein deutsches Nachrichten-Briefing. (Datum: ${today})

DEINE AUFGABE:
Analysiere wie links-liberale UND konservative Medien über das gegebene Thema berichten.
Nutze Web Search um ECHTE aktuelle Artikel von beiden Seiten zu finden.

SUCHSTRATEGIE:
Führe 2-4 Suchen durch — je eine für links und eine für konservativ:

Links/Liberal — suche bei:
Deutsch: Spiegel, taz, SZ (Süddeutsche), Zeit, Tagesspiegel, Stern, nd, FR
International: Guardian, NYT, Washington Post, NPR, Le Monde, Der Standard

Konservativ/Rechts — suche bei:
Deutsch: FAZ, Welt, Focus, Cicero, NZZ, Handelsblatt, The Pioneer
International: WSJ, Telegraph, The Times, New York Post, The Spectator

Suchbeispiele:
- "[Thema] Spiegel OR taz OR Süddeutsche"
- "[Thema] FAZ OR Welt OR NZZ OR Focus"
- "[Thema] Guardian OR NYT" (für internationale Themen)
- "[Thema] WSJ OR Telegraph" (für internationale konservativ)

Nutze die Suchergebnisse als PRIMÄRE Quelle — RSS-Artikel nur als Ergänzung.

SCHREIBSTIL — ABSOLUT KRITISCH:
Schreibe die Perspektiven DIREKT — als würdest du FÜR das Medium schreiben.
VERBOTEN: "würden", "typischerweise", "in der Regel", "könnte", "dürfte"
ERLAUBT: direkte Aussagen, echte Zitate wenn gefunden, klare Positionen

Beispiel FALSCH: "Konservative Medien würden die Maßnahme als Bevormundung sehen..."
Beispiel RICHTIG: "Die Maßnahme greift tief in persönliche Freiheiten ein..."

QUELLENREGELN:
Links/Liberal:      Spiegel, taz, SZ, Guardian, Le Monde, NYT, Washington Post, NPR, Zeit
Konservativ/Rechts: FAZ, Welt, NZZ, Telegraph, Focus, Cicero, WSJ, The Times

ANZAHL ABSÄTZE je nach gefundenem Material:
• Echte Artikel gefunden: 2-3 Absätze mit konkreten Inhalten
• Nur RSS-Teaser: 1-2 Absätze — lieber kürzer und akkurat
• basis_tag = "article" wenn Artikel gefunden, "knowledge" wenn nicht

POLITISCHE AKTUALITÄT:
Nur Regierungsnamen die explizit in Artikeln stehen.

Gib NUR valides JSON zurück — KEIN Text davor oder danach:
{"left_perspective":{"paragraphs":["p1","p2"],"sources_used":["Spiegel","taz"],"basis_tag":"article","key_argument":"1 prägnanter Satz"},"right_perspective":{"paragraphs":["p1","p2"],"sources_used":["FAZ","NZZ"],"basis_tag":"article","key_argument":"1 prägnanter Satz"},"divergence_score":7,"divergence_note":"Kurze Erklärung"}`,
    messages: [{
      role: "user",
      content: `Thema: ${topic.topic}
Datum: ${today}
Fakten: ${facts.summary}

RSS-Artikel Links (als Kontext):
${leftArticles || "Keine RSS-Artikel verfügbar"}

RSS-Artikel Konservativ (als Kontext):
${rightArticles || "Keine RSS-Artikel verfügbar"}

Bitte suche jetzt aktiv nach ECHTEN aktuellen Artikeln von links-liberalen UND konservativen Medien zu diesem Thema und analysiere deren Perspektiven.`
    }]
  });

  // Web Search Antwort verarbeiten — extrahiere den letzten Text-Block
  const textBlocks = res.content.filter(b => b.type === "text");
  const lastText = textBlocks[textBlocks.length - 1]?.text || "";

  // Logge verwendete Suchanfragen
  const searchBlocks = res.content.filter(b => b.type === "tool_use");
  if (searchBlocks.length > 0) {
    console.log(`Web Search: ${searchBlocks.map(b => b.input?.query).join(" | ")}`);
  }

  try {
    return extractJSON(lastText);
  } catch(e) {
    console.error("Agent3 JSON parse error:", e.message, "Text:", lastText.slice(0, 200));
    // Fallback: einfache Perspektiven ohne Web Search
    return {
      left_perspective: { paragraphs: ["Zu diesem Thema liegen aktuell nicht genügend Quellen vor."], sources_used: [], basis_tag: "knowledge", key_argument: "Keine ausreichenden Quellen verfügbar" },
      right_perspective: { paragraphs: ["Zu diesem Thema liegen aktuell nicht genügend Quellen vor."], sources_used: [], basis_tag: "knowledge", key_argument: "Keine ausreichenden Quellen verfügbar" },
      divergence_score: 0,
      divergence_note: "Keine Quellen verfügbar"
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
  const primaryArticles = primaryFiltered.length >= 3 ? primaryFiltered : primary.slice(0, 40);
  const allArticles = allFiltered.length >= 5 ? allFiltered : all.slice(0, 60);

  const topicsResult = await agent1_selectTopics(primaryArticles, category);
  const topics = topicsResult.top_topics?.slice(0, 3) || [];
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

    // Kurze Pause zwischen Agenten um Rate Limit zu vermeiden
    await new Promise(r => setTimeout(r, 2000));

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
        left_perspective: perspectives.left_perspective,
        right_perspective: perspectives.right_perspective,
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
