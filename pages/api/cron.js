import Anthropic from "@anthropic-ai/sdk";
import { put, list } from "@vercel/blob";
import { fetchAllFeeds, filterByCategory } from "../../lib/rss";
import { PRIMARY_SOURCES, SECONDARY_SOURCES, CATEGORIES } from "../../lib/sources";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function extractJSON(text) {
  const noCites = text.replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "");
  const clean = noCites.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error("Kein valides JSON gefunden");
}

function stripCites(text) {
  if (!text) return text;
  return text.replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "").trim();
}

async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err) {
      if (err.status === 429 && attempt < maxRetries) {
        const wait = attempt * 15000;
        console.log(`Rate limit — warte ${wait/1000}s (Versuch ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
      } else { throw err; }
    }
  }
}

function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── AGENT 1: RSS → TOP THEMEN ────────────────────────────────────────────────

async function agent1_selectTopics(primaryArticles, category) {
  const list = primaryArticles.slice(0, 25).map((a, i) =>
    `[${i+1}] [${a.source}] ${a.title}`
  ).join("\n");

  const res = await withRetry(() => client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: `Du bist ein Themen-Analysator für ein tägliches Nachrichten-Briefing.
Identifiziere die 3 wichtigsten und meistberichteten Themen für: "${category.label} – ${category.sub}".

DIVERSITÄTS-REGEL — KRITISCH:
Die 3 Themen müssen UNTERSCHIEDLICHE Ereignisse sein — verschiedene Länder, Schauplätze, Akteure.
NIEMALS 2 Themen zum selben Konflikt oder Land wählen.

${category.id.includes("deutschland") ? `
DEUTSCHLAND-REGEL: Nur Themen bei denen Deutschland das HAUPTTHEMA ist.
✅ Innenpolitik, deutsche Unternehmen, direkte DE-Auswirkungen
❌ Internationale Themen die Deutschland nur am Rande erwähnen
` : ""}

${category.id.includes("boerse") ? `
NUR: Börsenkurse, Quartalsberichte, Fusionen, Übernahmen, Dividenden.
${category.id === "boerse-deutschland" ? "Fokus: DAX, MDAX, SDAX Unternehmen." : ""}
` : ""}

Themen IMMER auf Deutsch formulieren.
Quellen: Nur Medienname (z.B. "Tagesschau", "BBC") — kein "Liveblog", "Teaser" etc.

Gib NUR valides JSON zurück:
{"top_topics":[{"rank":1,"topic":"Max 8 Wörter auf Deutsch","source_count":5,"sources":["BBC","Tagesschau"],"representative_title":"Titel"}]}`,
    messages: [{ role: "user", content: `Kategorie: ${category.label} – ${category.sub}\n\nArtikel:\n${list}` }]
  }));
  return extractJSON(res.content[0].text);
}

// ─── AGENT 2: FAKTEN EXTRAHIEREN ──────────────────────────────────────────────

async function agent2_extractFacts(topic, allArticles) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
  const sorted = [...allArticles].sort((a, b) => (b.hasFullText ? 1 : 0) - (a.hasFullText ? 1 : 0));
  const fulltextCount = allArticles.filter(a => a.hasFullText).length;
  const texts = sorted.slice(0, 6).map(a =>
    `[${a.source}]\nTitel: ${a.title}\nInhalt: ${a.summary.slice(0, 400)}`
  ).join("\n---\n");

  const res = await withRetry(() => client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `Du bist ein objektiver Fakten-Extraktor. (Datum: ${today})

Extrahiere die wichtigsten belegten Fakten aus den Artikeln.
Schreibe AUSSCHLIESSLICH was in den Artikeln steht — kein Trainingswissen.
Headline und Summary IMMER auf Deutsch.
Quellen: Nur Medienname (z.B. "Tagesschau") — kein "Liveblog", "Teaser".

HEADLINE-REGEL:
NIEMALS "Keine Artikel verfügbar" oder ähnliches schreiben.
Basiere die Headline auf dem Thema-Namen wenn wenig Material vorhanden.

VERBOTEN: Wertende Adjektive, Koalitionsnamen ohne Beleg, Spekulationen.

Gib NUR valides JSON zurück mit den Feldern: headline, summary, confidence.`,
    messages: [{ role: "user", content: `Thema: ${topic.topic}\nVerfügbar: ${fulltextCount} Volltexte\n\nArtikel:\n${texts}` }]
  }));
  return extractJSON(res.content[0].text);
}

// ─── AGENT 3a: WEB SEARCH → LINKE QUELLEN ────────────────────────────────────

async function agent3a_searchLeft(topic, category) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
  const isGerman = category.id.includes("deutschland");

  // Einfache Suchanfragen — site: Operator funktioniert nicht zuverlässig mit Haiku
  const searches = isGerman ? [
    `${topic.topic} Spiegel ODER taz ODER Süddeutsche Zeitung`,
    `${topic.topic} Zeit Online ODER Tagesspiegel ODER Stern`,
  ] : [
    `${topic.topic} Guardian OR "New York Times" OR NPR`,
    `${topic.topic} "Washington Post" OR "Le Monde"`,
  ];

  const res = await withRetry(() => client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    system: `Du suchst nach Artikeln von links-liberalen Medien. (Datum: ${today})

Führe BEIDE Suchen durch:
1. ${searches[0]}
2. ${searches[1]}

Extrahiere aus den Suchergebnissen die Artikel von diesen Medien:
Deutsch: Spiegel, taz, Süddeutsche Zeitung, Zeit, Tagesspiegel, Stern, nd, Frankfurter Rundschau
International: Guardian, New York Times, NPR, Washington Post, Le Monde, Der Standard

WICHTIG: Ignoriere Parteiseiten, Blogs, RT, unbekannte Seiten.
Wenn du Artikel dieser Medien findest, extrahiere Titel und Kernaussagen.

Gib NUR valides JSON zurück:
{"articles":[{"source":"Spiegel","title":"Artikeltitel","key_points":["Kernaussage 1","Kernaussage 2"]}],"search_successful":true}`,
    messages: [{
      role: "user",
      content: `Thema: ${topic.topic}\nDatum: ${today}\n\nFühre diese Suchen durch:\n1. ${searches[0]}\n2. ${searches[1]}\n\nExtrahiere NUR Artikel von bekannten links-liberalen Medien.`
    }]
  }));

  const textBlocks = res.content.filter(b => b.type === "text");
  const searchBlocks = res.content.filter(b => b.type === "tool_use");
  console.log(`Agent 3a (Links) Search: ${searchBlocks.map(b => b.input?.query).join(" | ")}`);

  let lastText = "";
  for (const block of [...textBlocks].reverse()) {
    if (block.text?.includes('"articles"')) { lastText = block.text; break; }
  }
  if (!lastText && textBlocks.length > 0) lastText = textBlocks[textBlocks.length - 1]?.text || "";

  try {
    const result = extractJSON(lastText);
    // Filtere unbekannte Quellen und dedupliziere nach Source
    const allowedLeft = [
      "Spiegel", "taz", "Süddeutsche", "Süddeutsche Zeitung", "SZ",
      "Zeit", "Zeit Online", "Tagesspiegel", "Frankfurter Rundschau", "FR",
      "Stern", "nd", "Neues Deutschland", "Berliner Zeitung", "RND",
      "Deutschlandfunk", "MDR", "ARD", "ZDF", "Deutsche Welle", "DW",
      "Guardian", "The Guardian", "New York Times", "NYT",
      "NPR", "Washington Post", "Le Monde", "Der Standard", "The Independent",
      "BBC", "Al Jazeera",
    ];
    const seen = new Set();
    result.articles = (result.articles || []).filter(a => {
      const isAllowed = allowedLeft.some(allowed => a.source?.toLowerCase().includes(allowed.toLowerCase()));
      if (!isAllowed) return false;
      const key = a.source?.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`Agent 3a: ${result.articles.length} linke Artikel (${result.articles.map(a => a.source).join(", ")})`);
    return result;
  } catch {
    return { articles: [], search_successful: false };
  }
}

// ─── AGENT 3b: WEB SEARCH → KONSERVATIVE QUELLEN ─────────────────────────────

async function agent3b_searchRight(topic, category) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
  const isGerman = category.id.includes("deutschland");

  // Einfache Suchanfragen — site: Operator funktioniert nicht zuverlässig mit Haiku
  const searches = isGerman ? [
    `${topic.topic} FAZ ODER "Frankfurter Allgemeine" ODER Welt ODER NZZ`,
    `${topic.topic} Focus ODER Cicero ODER Handelsblatt`,
  ] : [
    `${topic.topic} "Wall Street Journal" OR Telegraph OR "Washington Examiner"`,
    `${topic.topic} NZZ OR "The Times" OR Spectator`,
  ];

  const res = await withRetry(() => client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    system: `Du suchst nach Artikeln von konservativen Medien. (Datum: ${today})

Führe BEIDE Suchen durch:
1. ${searches[0]}
2. ${searches[1]}

Extrahiere aus den Suchergebnissen die Artikel von diesen Medien:
Deutsch: FAZ, Frankfurter Allgemeine, Welt, NZZ, Focus, Cicero, Handelsblatt, Wirtschaftswoche
International: Wall Street Journal, WSJ, Telegraph, Washington Examiner, The Times, The Spectator

WICHTIG: Ignoriere Breitbart, RT, Blogs, Parteiseiten.
Guardian, NYT, taz, Spiegel sind NIEMALS konservative Quellen.

Gib NUR valides JSON zurück:
{"articles":[{"source":"FAZ","title":"Artikeltitel","key_points":["Kernaussage 1","Kernaussage 2"]}],"search_successful":true}`,
    messages: [{
      role: "user",
      content: `Thema: ${topic.topic}\nDatum: ${today}\n\nFühre diese Suchen durch:\n1. ${searches[0]}\n2. ${searches[1]}\n\nExtrahiere NUR Artikel von bekannten konservativen Medien.`
    }]
  }));

  const textBlocks = res.content.filter(b => b.type === "text");
  const searchBlocks = res.content.filter(b => b.type === "tool_use");
  console.log(`Agent 3b (Rechts) Search: ${searchBlocks.map(b => b.input?.query).join(" | ")}`);

  let lastText = "";
  for (const block of [...textBlocks].reverse()) {
    if (block.text?.includes('"articles"')) { lastText = block.text; break; }
  }
  if (!lastText && textBlocks.length > 0) lastText = textBlocks[textBlocks.length - 1]?.text || "";

  try {
    const result = extractJSON(lastText);
    // Filtere unbekannte Quellen und dedupliziere nach Source
    const allowedRight = [
      "FAZ", "Frankfurter Allgemeine", "Welt", "Die Welt", "NZZ",
      "Neue Zürcher Zeitung", "Focus", "Cicero", "Handelsblatt",
      "Wirtschaftswoche", "WiWo", "Capital", "Rheinische Post", "RP Online",
      "Wall Street Journal", "WSJ", "Telegraph", "The Telegraph",
      "Washington Examiner", "The Times", "Spectator", "The Spectator",
    ];
    const seenRight = new Set();
    result.articles = (result.articles || []).filter(a => {
      const isAllowed = allowedRight.some(allowed => a.source?.toLowerCase().includes(allowed.toLowerCase()));
      if (!isAllowed) return false;
      const key = a.source?.toLowerCase();
      if (seenRight.has(key)) return false;
      seenRight.add(key);
      return true;
    });
    console.log(`Agent 3b: ${result.articles.length} konservative Artikel (${result.articles.map(a => a.source).join(", ")})`);
    return result;
  } catch {
    return { articles: [], search_successful: false };
  }
}

// ─── AGENT 4a: LINKE PERSPEKTIVE SCHREIBEN ────────────────────────────────────

async function agent4a_writeLeftPerspective(topic, facts, leftSearchResults) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  const articlesText = leftSearchResults.articles?.length > 0
    ? leftSearchResults.articles.map(a =>
        `[${a.source}]\nTitel: ${a.title}\nAussagen: ${a.key_points?.join(", ")}`
      ).join("\n---\n")
    : "Keine Artikel gefunden";

  const res = await withRetry(() => client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: [
      {
        type: "text",
        text: `Du schreibst die links-liberale Perspektive für ein ausgewogenes Nachrichten-Briefing.

DEINE AUFGABE:
Schreibe 2-3 Absätze die zeigen wie links-liberale Medien über dieses Thema berichten.
Basiere dich AUSSCHLIESSLICH auf den gefundenen Artikeln.

SCHREIBSTIL — ABSOLUT KRITISCH:
Schreibe DIREKT im Stil der Medien — nicht ÜBER sie.
VERBOTEN: "würden", "typischerweise", "in der Regel", "dürfte"
RICHTIG: Direkte Aussagen aus den Artikeln, echte Zitate, klare Positionen

ERLAUBTE LINKE QUELLEN:
Spiegel, taz, Süddeutsche, Zeit, Tagesspiegel, Frankfurter Rundschau,
Stern, nd, Guardian, NYT, NPR, Washington Post, Le Monde, Der Standard

ABSÄTZE je nach Material:
• Mehrere Artikel gefunden: 2-3 Absätze
• Wenig Material: 1-2 Absätze — lieber kürzer und akkurat

Gib NUR valides JSON zurück:
{"paragraphs":["Absatz 1","Absatz 2"],"sources_used":["Spiegel","taz"],"basis_tag":"article","key_argument":"1 prägnanter Satz der die linke Kernposition beschreibt"}`,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [{ role: "user", content: `Datum: ${today}\nThema: ${topic.topic}\nFakten: ${facts.summary}\n\nGefundene linke Artikel:\n${articlesText}` }]
  }));

  try { return extractJSON(res.content[0].text); }
  catch {
    return { paragraphs: ["Keine Analyse verfügbar."], sources_used: [], basis_tag: "knowledge", key_argument: "" };
  }
}

// ─── AGENT 4b: KONSERVATIVE PERSPEKTIVE SCHREIBEN ────────────────────────────

async function agent4b_writeRightPerspective(topic, facts, rightSearchResults) {
  const today = new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  const articlesText = rightSearchResults.articles?.length > 0
    ? rightSearchResults.articles.map(a =>
        `[${a.source}]\nTitel: ${a.title}\nAussagen: ${a.key_points?.join(", ")}`
      ).join("\n---\n")
    : "Keine Artikel gefunden";

  const res = await withRetry(() => client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: [
      {
        type: "text",
        text: `Du schreibst die konservative Perspektive für ein ausgewogenes Nachrichten-Briefing.

DEINE AUFGABE:
Schreibe 2-3 Absätze die zeigen wie konservative Medien über dieses Thema berichten.
Basiere dich AUSSCHLIESSLICH auf den gefundenen Artikeln.

SCHREIBSTIL — ABSOLUT KRITISCH:
Schreibe DIREKT im Stil der Medien — nicht ÜBER sie.
VERBOTEN: "würden", "typischerweise", "in der Regel", "dürfte"
RICHTIG: Direkte Aussagen aus den Artikeln, echte Zitate, klare Positionen

ERLAUBTE KONSERVATIVE QUELLEN:
FAZ, Welt, NZZ, Focus, Cicero, Handelsblatt, Wirtschaftswoche,
WSJ, Telegraph, Washington Examiner, The Times, The Spectator
Guardian, NYT, taz, Spiegel sind NIEMALS konservative Quellen.

ABSÄTZE je nach Material:
• Mehrere Artikel gefunden: 2-3 Absätze
• Wenig Material: 1-2 Absätze — lieber kürzer und akkurat

Gib NUR valides JSON zurück:
{"paragraphs":["Absatz 1","Absatz 2"],"sources_used":["FAZ","NZZ"],"basis_tag":"article","key_argument":"1 prägnanter Satz der die konservative Kernposition beschreibt"}`,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [{ role: "user", content: `Datum: ${today}\nThema: ${topic.topic}\nFakten: ${facts.summary}\n\nGefundene konservative Artikel:\n${articlesText}` }]
  }));

  try { return extractJSON(res.content[0].text); }
  catch {
    return { paragraphs: ["Keine Analyse verfügbar."], sources_used: [], basis_tag: "knowledge", key_argument: "" };
  }
}

// ─── AGENT 5: QUALITÄTSPRÜFUNG ────────────────────────────────────────────────

async function agent5_qualityCheck(item) {
  const res = await withRetry(() => client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: [
      {
        type: "text",
        text: `Du prüfst die Qualität eines Nachrichten-Briefings.

Prüfe ob:
1. Headline auf Deutsch und sachlich formuliert
2. Keine "würden/typischerweise/in der Regel" Formulierungen
3. Links und Rechts sind unterschiedliche Perspektiven (nicht identisch)
4. Keine politisch wertenden Formulierungen ohne Quellenbeleg
5. Keine <cite> Tags im Text

Gib NUR valides JSON zurück:
{"approved":true,"quality_score":8,"issues":[]}`,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [{
      role: "user",
      content: JSON.stringify({
        headline: item.headline,
        summary: item.summary,
        left_key: item.left_perspective?.key_argument,
        right_key: item.right_perspective?.key_argument,
        left_sample: item.left_perspective?.paragraphs?.[0]?.slice(0, 200),
        right_sample: item.right_perspective?.paragraphs?.[0]?.slice(0, 200),
      })
    }]
  }));
  try { return extractJSON(res.content[0].text); }
  catch { return { approved: true, quality_score: 7, issues: [] }; }
}

// ─── CATEGORY BRIEFING GENERATOR ──────────────────────────────────────────────

async function generateCategoryBriefing(categoryId) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) throw new Error(`Kategorie nicht gefunden: ${categoryId}`);

  // Feeds laden
  const { primary, secondary, all } = await fetchAllFeeds(PRIMARY_SOURCES, SECONDARY_SOURCES);

  // Nach Kategorie filtern
  const primaryFiltered = filterByCategory(primary, category.keywords);
  const allFiltered = filterByCategory(all, category.keywords);

  const primaryArticles = primaryFiltered.length >= 3 ? primaryFiltered : primary.slice(0, 25);
  const allArticles = allFiltered.length >= 5 ? allFiltered : all.slice(0, 35);

  console.log(`Feeds: ${primary.length} primär, ${secondary.length} sekundär`);
  console.log(`Gefiltert: ${primaryFiltered.length} primär, ${allFiltered.length} gesamt`);

  // Agent 1: Top Themen — kurze Pause damit Feed-Requests abgeklungen sind
  await pause(2000);
  const topicsResult = await agent1_selectTopics(primaryArticles, category);
  const topics = topicsResult.top_topics?.slice(0, 2) || []; // 2 bis Tier 4 aktiv
  console.log(`Themen: ${topics.map(t => t.topic).join(" | ")}`);

  // Pro Thema: Agenten 2-5 sequentiell
  const newsItems = [];
  for (const topic of topics) {
    console.log(`\nVerarbeite: "${topic.topic}"`);

    // Agent 2: Fakten
    const topicArticles = allArticles.filter(a => topic.sources?.includes(a.source));
    const usedArticles = topicArticles.length >= 3 ? topicArticles : allArticles.slice(0, 12);
    const facts = await agent2_extractFacts(topic, usedArticles);
    console.log(`  Agent 2: "${facts.headline}" (${facts.confidence})`);

    // Agents 3a + 3b parallel (beide Web Searches gleichzeitig)
    await pause(5000);
    const [leftSearch, rightSearch] = await Promise.all([
      agent3a_searchLeft(topic, category),
      agent3b_searchRight(topic, category),
    ]);
    console.log(`  Agent 3a: ${leftSearch.articles?.length || 0} linke Artikel`);
    console.log(`  Agent 3b: ${rightSearch.articles?.length || 0} konservative Artikel`);

    // Agents 4a + 4b parallel (beide Perspektiven gleichzeitig)
    await pause(5000);
    const [leftPerspective, rightPerspective] = await Promise.all([
      agent4a_writeLeftPerspective(topic, facts, leftSearch),
      agent4b_writeRightPerspective(topic, facts, rightSearch),
    ]);
    console.log(`  Agent 4a: ${leftPerspective.sources_used?.join(", ")}`);
    console.log(`  Agent 4b: ${rightPerspective.sources_used?.join(", ")}`);

    // Divergenz berechnen
    const divergenceScore = leftSearch.search_successful && rightSearch.search_successful ? 7 : 4;

    newsItems.push({
      headline: facts.headline,
      summary: facts.summary,
      confidence: facts.confidence,
      source_count: topic.source_count,
      sources: topic.sources || [],
      left_perspective: {
        paragraphs: leftPerspective.paragraphs?.map(stripCites) || [],
        sources_used: leftPerspective.sources_used || [],
        basis_tag: leftPerspective.basis_tag || "knowledge",
        key_argument: leftPerspective.key_argument || "",
      },
      right_perspective: {
        paragraphs: rightPerspective.paragraphs?.map(stripCites) || [],
        sources_used: rightPerspective.sources_used || [],
        basis_tag: rightPerspective.basis_tag || "knowledge",
        key_argument: rightPerspective.key_argument || "",
      },
      divergence_score: divergenceScore,
      divergence_note: "",
    });

    // Pause zwischen Themen
    if (topics.indexOf(topic) < topics.length - 1) {
      await pause(15000);
    }
  }

  // Agent 5: Qualitätsprüfung für alle Items
  const checkedItems = [];
  for (const item of newsItems) {
    const quality = await agent5_qualityCheck(item);
    checkedItems.push({ ...item, quality: { approved: quality.approved, score: quality.quality_score } });
  }

  const timestamp = new Date().toISOString();
  const data = {
    category: categoryId,
    generated_at: timestamp,
    items: checkedItems,
  };

  // In Vercel Blob speichern
  const today = new Date().toISOString().split("T")[0];
  const filename = `briefings/briefing-${categoryId}-${today}.json`;
  await put(filename, JSON.stringify(data), { access: "public", addRandomSuffix: false });
  console.log(`✅ ${categoryId} — ${checkedItems.length} Artikel gespeichert`);

  return data;
}

// ─── API HANDLER ──────────────────────────────────────────────────────────────

export const maxDuration = 300;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { secret } = req.query;
    if (secret !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { categoryId } = req.query;
  if (!categoryId) return res.status(400).json({ error: "categoryId required" });

  console.log(`Cron gestartet: ${categoryId}`);

  try {
    const data = await generateCategoryBriefing(categoryId);
    return res.status(200).json({ success: true, items: data.items.length });
  } catch (err) {
    console.error(`❌ ${categoryId}: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
