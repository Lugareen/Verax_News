import { useState } from "react";
import Head from "next/head";

const CATEGORIES = [
  { id: "politik-international", label: "🌍 Politik & Wirtschaft International" },
  { id: "politik-deutschland",   label: "🇩🇪 Politik & Wirtschaft Deutschland" },
  { id: "boerse-international",  label: "📈 Börsennachrichten International" },
  { id: "boerse-deutschland",    label: "🏦 Börsennachrichten Deutschland" },
];

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [states, setStates] = useState({});
  const [results, setResults] = useState({});

  const trigger = async (categoryId) => {
    if (!secret) return alert("Bitte CRON_SECRET eingeben");
    setStates(s => ({ ...s, [categoryId]: "loading" }));
    setResults(r => ({ ...r, [categoryId]: null }));
    try {
      const res = await fetch(`/api/cron?categoryId=${categoryId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const json = await res.json();
      setResults(r => ({ ...r, [categoryId]: json }));
      setStates(s => ({ ...s, [categoryId]: res.ok ? "success" : "error" }));
    } catch (e) {
      setResults(r => ({ ...r, [categoryId]: { error: e.message } }));
      setStates(s => ({ ...s, [categoryId]: "error" }));
    }
  };

  const triggerAll = () => CATEGORIES.forEach(c => trigger(c.id));

  return (
    <>
      <Head><title>Verax Admin</title></Head>
      <div style={{ minHeight:"100vh", background:"#0D1B3E", fontFamily:"'DM Sans', sans-serif", padding:32 }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:"#C9933A", marginBottom:8 }}>Admin Panel</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#fff", marginBottom:24 }}>Verax News — Briefing Generator</h1>

          {/* Secret Input */}
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:12, padding:20, marginBottom:24 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:8 }}>CRON_SECRET</label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Dein CRON_SECRET..."
              style={{ width:"100%", padding:"12px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:14, fontFamily:"inherit", outline:"none" }}
            />
          </div>

          {/* Alle generieren */}
          <button onClick={triggerAll} style={{ width:"100%", padding:"14px", background:"#C9933A", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:24 }}>
            ⚡ Alle 4 Kategorien generieren
          </button>

          {/* Einzelne Kategorien */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {CATEGORIES.map(cat => {
              const state = states[cat.id] || "idle";
              const result = results[cat.id];
              return (
                <div key={cat.id} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:16, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1, fontSize:14, color:"#fff" }}>{cat.label}</div>
                  <div style={{ fontSize:12, color: state==="success" ? "#4CAF50" : state==="error" ? "#f44336" : state==="loading" ? "#C9933A" : "rgba(255,255,255,0.3)" }}>
                    {state==="success" ? "✅ Fertig" : state==="error" ? "❌ Fehler" : state==="loading" ? "⏳ Läuft…" : "—"}
                  </div>
                  <button
                    onClick={() => trigger(cat.id)}
                    disabled={state==="loading"}
                    style={{ padding:"8px 16px", background: state==="loading" ? "rgba(255,255,255,0.05)" : "rgba(201,147,58,0.2)", color: state==="loading" ? "rgba(255,255,255,0.2)" : "#C9933A", border:"1px solid rgba(201,147,58,0.3)", borderRadius:6, fontSize:12, fontWeight:600, cursor: state==="loading" ? "not-allowed" : "pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                  >
                    {state==="loading" ? "Läuft…" : "▶ Generieren"}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop:32, fontSize:11, color:"rgba(255,255,255,0.2)", textAlign:"center" }}>
            Diese Seite nicht öffentlich teilen. Nur für Administratoren.
          </div>
        </div>
      </div>
    </>
  );
}
