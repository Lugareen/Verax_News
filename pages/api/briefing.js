import { list } from "@vercel/blob";

// Gespeichertes Briefing aus Vercel Blob abrufen
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { categoryId } = req.query;
  if (!categoryId) return res.status(400).json({ error: "categoryId required" });

  try {
    const today = new Date().toISOString().split("T")[0];
    const filename = `briefings/briefing-${categoryId}-${today}.json`;

    // Blob-Liste nach heutigem Briefing durchsuchen
    const { blobs } = await list({ prefix: `briefings/briefing-${categoryId}` });

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({
        error: "Kein Briefing verfügbar",
        message: "Das heutige Briefing wird täglich um 06:00 Uhr bereitgestellt.",
      });
    }

    // Neuestes Briefing nehmen (nach Datum sortiert)
    const latest = blobs.sort((a, b) =>
      new Date(b.uploadedAt) - new Date(a.uploadedAt)
    )[0];

    // Inhalt abrufen
    const response = await fetch(latest.url);
    const data = await response.json();

    return res.status(200).json({
      success: true,
      data,
      blob_url: latest.url,
      last_updated: latest.uploadedAt,
    });

  } catch (error) {
    console.error("Briefing fetch error:", error);
    return res.status(500).json({ error: error.message });
  }
}
