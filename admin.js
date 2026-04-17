import { useState } from "react";
import Head from "next/head";

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);

  const triggerCron = async () => {
    if (!secret) return alert("Bitte CRON_SECRET eingeben");
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/cron", {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const json = await res.json();
      setResult(json);
      setState(res.ok ? "success" : "error");
    } catch (e) {
      setResult({ error: e.message });
      setState("error");
    }
  };

  return (
    <>
      <Head><title>Verax Admin</title></Head>
      <div style={{ minHeight:"100vh", background:"#0D1B3E", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans', sans-serif", padding:24 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:40, maxWidth:500, width:"100%" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:"#C9933A", marginBottom:8 }}>Admin Panel</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#0D1B3E", marginBottom:8 }}>Briefing manuell generieren</h1>
          <p style={{ fontSize:14, color:"#6B6B80", marginBottom:32, lineHeight:1.6 }}>
            Löst den Cron Job manuell aus — generiert das Briefing für alle 4 Kategorien und speichert es in Vercel Blob.
            Dauert ca. 3–5 Minuten.
          </p>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#0D1B3E", display:"block", marginBottom:6 }}>CRON_SECRET</label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Dein CRON_SECRET aus Vercel..."
              style={{ width:"100%", padding:"12px 16px", borderRadius:8, border:"1.5px solid rgba(13,27,62,0.15)", fontSize:14, fontFamily:"inherit", outline:"none" }}
            />
          </div>

          <button
            onClick={triggerCron}
            disabled={state === "loading"}
            style={{ width:"100%", padding:"14px 24px", background: state==="loading" ? "rgba(13,27,62,0.3)" : "#0D1B3E", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor: state==="loading" ? "not-allowed" : "pointer", fontFamily:"inherit", marginBottom:16 }}
          >
            {state === "loading" ? "⏳ Generiere Briefings… (3-5 Min.)" : "▶ Briefing jetzt generieren"}
          </button>

          {state === "loading" && (
            <div style={{ background:"#F2F0EB", borderRadius:8, padding:16, fontSize:13, color:"#6B6B80", lineHeight:1.7 }}>
              <strong style={{ color:"#0D1B3E" }}>Läuft gerade:</strong><br/>
              🔍 RSS-Feeds werden geladen…<br/>
              📊 Themen werden identifiziert…<br/>
              ⚖️ Fakten werden extrahiert…<br/>
              📰 Perspektiven werden analysiert…<br/>
              ✓ Qualität wird geprüft…
            </div>
          )}

          {state === "success" && (
            <div style={{ background:"#E8F5E9", border:"1px solid rgba(46,125,50,0.2)", borderRadius:8, padding:16, fontSize:13, color:"#2E7D32" }}>
              ✅ <strong>Briefings erfolgreich generiert!</strong><br/>
              <span style={{ color:"#6B6B80" }}>Du kannst jetzt die Startseite öffnen — das Briefing ist live.</span>
              {result?.categories && (
                <div style={{ marginTop:8 }}>Kategorien: {result.categories.join(", ")}</div>
              )}
            </div>
          )}

          {state === "error" && (
            <div style={{ background:"rgba(255,60,60,0.06)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:8, padding:16, fontSize:13, color:"#cc3333" }}>
              ❌ <strong>Fehler:</strong> {result?.error || "Unbekannter Fehler"}
            </div>
          )}

          <div style={{ marginTop:24, paddingTop:24, borderTop:"1px solid rgba(13,27,62,0.08)", fontSize:11, color:"#B0B0C0" }}>
            Diese Seite ist nur für Administratoren. Teile die URL nicht öffentlich.
          </div>
        </div>
      </div>
    </>
  );
}
