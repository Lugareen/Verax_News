import { useState } from "react";
import Head from "next/head";
import { CATEGORIES } from "../lib/sources";

// ─── HELPERS ──────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"40px 20px" }}>
      <div style={{ width:32, height:32, border:"3px solid rgba(13,27,62,0.08)", borderTop:"3px solid #C9933A", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <p style={{ color:"#B0B0C0", fontSize:12, fontFamily:"monospace" }}>RSS-Feeds laden & KI analysiert…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

function PerspectivePanel({ data, side }) {
  if (!data) return null;
  const isLeft = side === "left";
  const color = isLeft ? "#3B5BDB" : "#C9933A";
  const bg = isLeft ? "#EEF2FF" : "#FFF4E6";
  const border = isLeft ? "rgba(59,91,219,0.12)" : "rgba(201,147,58,0.18)";
  const textColor = isLeft ? "#2a3d8f" : "#7a4e1a";
  return (
    <div style={{ borderRadius:10, padding:20, background:bg, border:`1px solid ${border}`, display:"flex", flexDirection:"column", gap:10, flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color }}>{isLeft ? "◀ Links geprägte Medien" : "Konservativ geprägte Medien ▶"}</span>
        {data.sources_used?.length > 0 && <span style={{ fontSize:10, color:"#B0B0C0", marginLeft:"auto" }}>{data.sources_used.join(" · ")}</span>}
      </div>
      {(data.paragraphs || []).map((p, i) => (
        <p key={i} style={{ fontSize:13, lineHeight:1.75, fontWeight:300, margin:0, color:textColor }}>{p}</p>
      ))}
      {data.key_argument && (
        <div style={{ fontSize:11, fontStyle:"italic", color, borderTop:`1px solid ${border}`, paddingTop:8, marginTop:4 }}>„{data.key_argument}"</div>
      )}
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", padding:"2px 8px", borderRadius:4, background: data.basis_tag==="article" ? "rgba(59,91,219,0.1)" : "rgba(201,147,58,0.15)", color: data.basis_tag==="article" ? "#3B5BDB" : "#8a5a1a", marginTop:4, width:"fit-content" }}>
        {data.basis_tag === "article" ? "📰 Aus aktuellen Artikeln" : "🧠 Redaktionelle Linie"}
      </span>
    </div>
  );
}

function SourcesBlock({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  const leanColor = { left:"#3B5BDB", right:"#C9933A", neutral:"#B0B0C0" };
  const leanLabel = { left:"Links geprägte Medien", right:"Konservativ geprägte Medien", neutral:"Neutral / Agentur" };
  const knownLean = { "Spiegel Online":"left","Süddeutsche Zeitung":"left","taz":"left","The Guardian":"left","Le Monde":"left","FAZ":"right","Die Welt":"right","Focus Online":"right","NZZ":"right","Daily Telegraph":"right","Reuters":"neutral","BBC News":"neutral","dpa":"neutral","Handelsblatt":"neutral","Bloomberg":"neutral" };
  return (
    <div style={{ borderTop:"1px solid rgba(13,27,62,0.08)", paddingTop:12 }}>
      <button onClick={() => setOpen(!open)} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:600, color:"#B0B0C0", cursor:"pointer", background:"none", border:"none", padding:0, letterSpacing:"0.06em", textTransform:"uppercase" }}>
        <span>📎 Quellen {open ? "ausblenden" : "anzeigen"}</span>
        <span style={{ transition:"transform .2s", transform:open?"rotate(180deg)":"none", fontSize:9 }}>▼</span>
      </button>
      {open && (
        <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:10 }}>
          {sources.map((s, i) => {
            const lean = knownLean[s] || "neutral";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:7, background:"#FAFAF7" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:leanColor[lean], flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#0D1B3E" }}>{s}</div>
                  <div style={{ fontSize:10, color:leanColor[lean], textTransform:"uppercase", letterSpacing:"0.06em" }}>{leanLabel[lean]}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item, index }) {
  return (
    <div style={{ background:"#fff", padding:"32px 40px", borderBottom:"1px solid rgba(13,27,62,0.06)", display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
        <div style={{ minWidth:30, height:30, background:"rgba(201,147,58,0.12)", border:"1px solid rgba(201,147,58,0.3)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#C9933A", fontFamily:"monospace", flexShrink:0 }}>{index+1}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", color:"#C9933A", marginBottom:6 }}>
            Top Story {index+1}
            {item.source_count > 0 && <span style={{ marginLeft:8 }}>· {item.source_count} Quellen</span>}
            {item.confidence === "high" && <span style={{ marginLeft:8, background:"#E8F5E9", color:"#2E7D32", padding:"1px 6px", borderRadius:4, fontSize:9 }}>✓ Hoch verifiziert</span>}
          </div>
          <h3 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:20, fontWeight:700, color:"#0D1B3E", lineHeight:1.3, margin:0 }}>{item.headline}</h3>
        </div>
      </div>
      <p style={{ fontSize:14, color:"#6B6B80", lineHeight:1.75, fontWeight:300, margin:"0 0 0 44px" }}>{item.summary}</p>
      <div style={{ paddingLeft:44 }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#F0F4FF", border:"1px solid rgba(59,91,219,0.15)", borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:600, color:"#3B5BDB" }}>
          🤖 4-Agenten KI-Analyse · {item.sources?.length || "mehrere"} Quellen
          {item.quality?.score && <span style={{ marginLeft:4, opacity:0.7 }}>· Qualität: {item.quality.score}/10</span>}
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <PerspectivePanel data={item.left_perspective} side="left" />
        <PerspectivePanel data={item.right_perspective} side="right" />
      </div>
      <SourcesBlock sources={item.sources} />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#B0B0C0", borderTop:"1px solid rgba(13,27,62,0.06)", paddingTop:10 }}>
        <span>{item.sources?.length || "mehrere"} Quellen · Heute 06:00 Uhr</span>
        <span>5 Min. Lesezeit</span>
      </div>
    </div>
  );
}

function CategoryPanel({ cat }) {
  const [state, setState] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setState("loading"); setError("");
    try {
      const res = await fetch("/api/briefing", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ categoryId:cat.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Fehler");
      setData(json.data); setState("done");
    } catch(e) { setError(e.message); setState("error"); }
  };

  return (
    <div style={{ background:"#fff", border:"1px solid rgba(13,27,62,0.09)", marginBottom:2 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 40px", borderBottom:"1px solid rgba(13,27,62,0.06)", background:`linear-gradient(135deg, ${cat.bgColor}60, #fff)` }}>
        <div>
          <div style={{ fontSize:10, color:cat.accentColor, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:4 }}>{cat.label}</div>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#0D1B3E", fontFamily:"'Playfair Display', Georgia, serif", display:"flex", alignItems:"center", gap:10, margin:0 }}>
            {cat.icon} {cat.sub}
          </h2>
        </div>
        <button onClick={load} disabled={state==="loading"} style={{ background: state==="loading" ? "rgba(13,27,62,0.04)" : `${cat.accentColor}18`, border:`1px solid ${state==="loading" ? "rgba(13,27,62,0.1)" : cat.accentColor+"50"}`, color: state==="loading" ? "#B0B0C0" : cat.accentColor, borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:700, cursor: state==="loading" ? "not-allowed":"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
          {state==="loading" ? "Analysiere…" : state==="done" ? "↻ Aktualisieren" : "▶ Briefing laden"}
        </button>
      </div>
      {state==="loading" && <Spinner />}
      {state==="error" && <div style={{ padding:"16px 40px" }}><div style={{ background:"rgba(255,60,60,0.06)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:8, padding:"12px 16px", fontSize:13, color:"#cc3333" }}>⚠️ {error}</div></div>}
      {state==="done" && data && (
        <div>
          <div style={{ padding:"10px 40px 4px", fontSize:11, color:"#B0B0C0", fontFamily:"monospace" }}>
            Stand: {new Date(data.generated_at).toLocaleString("de-DE")} · Top 3 meistberichtete Themen · letzte 24h
          </div>
          {data.news.map((item, i) => <NewsCard key={i} item={item} index={i} />)}
        </div>
      )}
      {state==="idle" && <div style={{ padding:"28px 40px", textAlign:"center", color:"#B0B0C0", fontSize:13 }}>Klicke auf „Briefing laden" um die Top 3 Themen der letzten 24h zu analysieren</div>}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function Home() {
  const today = new Date().toLocaleDateString("de-DE", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  return (
    <>
      <Head>
        <title>Verax News — Die Nachricht. Beide Seiten. Dein Urteil.</title>
        <meta name="description" content="Tägliches KI-Briefing für Führungskräfte — objektiv, ausgewogen, mit Links & Rechts Perspektiven" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight:"100vh", background:"#FAFAF7", fontFamily:"'DM Sans', sans-serif" }}>
        <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}} @media(max-width:700px){.perspectives{grid-template-columns:1fr !important} .card-padding{padding:20px !important}}`}</style>

        {/* ── NAV ── */}
        <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(250,250,247,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(13,27,62,0.08)", padding:"0 48px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <svg width="28" height="28" viewBox="0 0 68 68" fill="none">
              <polygon points="5,8 34,60 34,8" fill="#0D1B3E"/>
              <polygon points="34,8 34,60 63,8" fill="#C9933A"/>
              <rect x="33" y="8" width="2" height="52" fill="#FAFAF7"/>
              <circle cx="34" cy="6" r="3" fill="#C9933A"/>
            </svg>
            <div>
              <div style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1 }}>VERAX</div>
              <div style={{ fontSize:8, fontWeight:500, letterSpacing:"0.38em", textTransform:"uppercase", color:"#C9933A" }}>NEWS</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:32 }}>
            <a href="#briefing" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>Briefing</a>
            <a href="#methodik" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>Methodik</a>
            <a href="#preise" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>Preise</a>
            <a href="#briefing" style={{ background:"#0D1B3E", color:"#fff", padding:"10px 22px", borderRadius:8, fontSize:13, fontWeight:500, textDecoration:"none" }}>Jetzt lesen</a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ minHeight:"100vh", padding:"140px 64px 80px", display:"flex", flexDirection:"column", justifyContent:"center", position:"relative", overflow:"hidden", background:"linear-gradient(160deg, #FAFAF7 60%, #F2F0EB 100%)" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(13,27,62,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(13,27,62,0.04) 1px,transparent 1px)", backgroundSize:"60px 60px", zIndex:0 }} />
          <div style={{ position:"absolute", top:-100, right:-100, width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,147,58,0.07) 0%,transparent 70%)", zIndex:0 }} />
          <div style={{ position:"relative", zIndex:1, maxWidth:800 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#F5E8D0", border:"1px solid rgba(201,147,58,0.3)", padding:"6px 14px", borderRadius:100, fontSize:11, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:"#C9933A", marginBottom:32 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9933A", animation:"pulse 2s infinite" }} />
              Tägliches KI-Nachrichten-Briefing
            </div>
            <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(40px,6vw,72px)", fontWeight:800, lineHeight:1.0, color:"#0D1B3E", letterSpacing:"-0.03em", marginBottom:28 }}>
              Die Nachricht.<br />
              <em style={{ fontFamily:"'Playfair Display', serif", fontStyle:"italic", color:"#C9933A", fontWeight:600 }}>Beide Seiten.</em><br />
              Dein Urteil.
            </h1>
            <p style={{ fontSize:18, fontWeight:300, color:"#6B6B80", lineHeight:1.65, maxWidth:560, marginBottom:48 }}>
              Täglich die wichtigsten Wirtschafts- und Politiknachrichten — objektiv zusammengefasst, mit linker und konservativer Perspektive. Für Entscheider, die selbst denken.
            </p>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <a href="#briefing" style={{ background:"#0D1B3E", color:"#fff", padding:"16px 36px", borderRadius:10, fontSize:15, fontWeight:500, textDecoration:"none", display:"inline-block" }}>Briefing lesen →</a>
              <a href="#methodik" style={{ background:"transparent", color:"#0D1B3E", padding:"16px 28px", borderRadius:10, fontSize:15, fontWeight:400, border:"1.5px solid rgba(13,27,62,0.2)", textDecoration:"none", display:"inline-block" }}>So funktioniert es</a>
            </div>
            <div style={{ display:"flex", gap:48, marginTop:64, paddingTop:40, borderTop:"1px solid rgba(13,27,62,0.09)", flexWrap:"wrap" }}>
              {[["3×","Top-Nachrichten pro Kategorie"],["2×","Perspektiven: Links & Rechts"],["10+","Verifizierte Quellen"],["5min","Täglicher Zeitaufwand"]].map(([num, label]) => (
                <div key={num}>
                  <div style={{ fontFamily:"'Syne', sans-serif", fontSize:32, fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em" }}>{num}</div>
                  <div style={{ fontSize:13, color:"#6B6B80", marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section style={{ background:"#0D1B3E", padding:"100px 64px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, right:0, width:500, height:500, background:"radial-gradient(circle,rgba(201,147,58,0.1) 0%,transparent 65%)" }} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center", position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Das Problem</div>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#fff", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:16 }}>Medien berichten selten wirklich neutral.</h2>
              <p style={{ fontSize:17, color:"rgba(255,255,255,0.55)", lineHeight:1.65, fontWeight:300, marginBottom:32 }}>Jede Zeitung hat eine politische Ausrichtung. Als vielbeschäftigte Führungskraft fehlt dir die Zeit, dutzende Quellen zu vergleichen.</p>
              <div style={{ borderLeft:"3px solid #C9933A", padding:"20px 24px", background:"rgba(255,255,255,0.04)", borderRadius:"0 8px 8px 0" }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:17, fontStyle:"italic", color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>„Ich lese täglich drei Zeitungen – und bekomme trotzdem nicht das volle Bild."</div>
                <div style={{ fontSize:12, color:"#C9933A", marginTop:10, fontWeight:500 }}>— Typischer Verax News Nutzer</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              {[["📰","Einseitige Berichterstattung","Linke und rechte Medien betonen dieselben Fakten völlig unterschiedlich."],["⏱","Keine Zeit für Recherche","Als Führungskraft hast du 10–15 Minuten täglich für Nachrichten."],["🌍","National und international","Du musst zu deutschen und globalen Themen sprechfähig sein."]].map(([icon, title, desc]) => (
                <div key={title} style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                  <div style={{ width:36, height:36, flexShrink:0, borderRadius:8, background:"rgba(201,147,58,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{icon}</div>
                  <div>
                    <div style={{ fontFamily:"'Syne', sans-serif", fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>{title}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.6, fontWeight:300 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="methodik" style={{ padding:"100px 64px", background:"#fff" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Unser Ansatz</div>
            <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:16 }}>Wir scannen. Wir vergleichen. Du entscheidest.</h2>
            <p style={{ fontSize:17, color:"#6B6B80", lineHeight:1.65, maxWidth:580, fontWeight:300, marginBottom:64 }}>Täglich um 6:00 Uhr werden die wichtigsten Nachrichten aus über 40 Quellen ausgewertet — strukturiert, ausgewogen und auf das Wesentliche reduziert.</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
              {[
                ["01","🗞️","Die relevantesten Themen","Täglich werden hunderte Artikel der letzten 24 Stunden ausgewertet. Ausgewählt werden die Themen, über die die meisten unabhängigen Quellen berichten — nicht die lautesten, sondern die wichtigsten."],
                ["02","⚖️","Fakten zuerst","Für jedes Thema wird eine objektive Zusammenfassung erstellt — ausschliesslich auf Basis belegter Informationen. Keine Einschätzungen, keine Wertungen, keine Spekulationen."],
                ["03","📰","Beide Seiten im Vergleich","Links geprägte und konservativ geprägte Medien werden getrennt analysiert. Du siehst auf einen Blick, welche Aspekte jede Seite betont — und kannst dir dein eigenes Urteil bilden."],
              ].map(([num, icon, title, desc]) => (
                <div key={num} style={{ background:"#FAFAF7", padding:"48px 36px" }}>
                  <div style={{ fontFamily:"'Syne', sans-serif", fontSize:56, fontWeight:800, color:"#F5E8D0", lineHeight:1, marginBottom:20 }}>{num}</div>
                  <div style={{ width:44, height:44, background:"#F5E8D0", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, fontSize:20 }}>{icon}</div>
                  <div style={{ fontFamily:"'Syne', sans-serif", fontSize:19, fontWeight:700, color:"#0D1B3E", marginBottom:12, lineHeight:1.2 }}>{title}</div>
                  <div style={{ fontSize:14, color:"#6B6B80", lineHeight:1.75, fontWeight:300 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE BRIEFING ── */}
        <section id="briefing" style={{ background:"#F2F0EB", padding:"100px 64px" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Live Briefing</div>
            <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:8 }}>Tagesaktuelle Nachrichten</h2>
            <p style={{ fontSize:14, color:"#6B6B80", marginBottom:48, fontFamily:"monospace" }}>{today} · Top 3 meistberichtete Themen je Kategorie</p>

            {/* Politik & Wirtschaft */}
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", fontFamily:"monospace", color:"#B0B0C0", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} /> Politik & Wirtschaft <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} />
            </div>
            {CATEGORIES.slice(0,2).map(cat => <CategoryPanel key={cat.id} cat={cat} />)}

            <div style={{ marginTop:32, fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", fontFamily:"monospace", color:"#B0B0C0", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} /> Börsennachrichten <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} />
            </div>
            {CATEGORIES.slice(2).map(cat => <CategoryPanel key={cat.id} cat={cat} />)}

            <div style={{ marginTop:32, padding:"16px 24px", background:"rgba(13,27,62,0.04)", border:"1px solid rgba(13,27,62,0.08)", borderRadius:10, fontSize:12, color:"#6B6B80", lineHeight:1.8 }}>
              <strong style={{ color:"#0D1B3E" }}>Quellen:</strong> Spiegel, SZ, taz, FAZ, Welt, Focus, Reuters, BBC, Handelsblatt, NZZ, Guardian, Bloomberg, Le Monde, Daily Telegraph · Themenauswahl nach Medienhäufigkeit · Perspektiven basieren auf tatsächlichen Artikeln
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="preise" style={{ padding:"100px 64px", background:"#F2F0EB" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Preise</div>
            <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:16 }}>Einfach. Transparent. Fair.</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, marginTop:48 }}>
              {[
                { name:"Free", price:"€0", period:"für immer kostenlos", features:["Politik & Wirtschaft International","Top 3 Nachrichten täglich","Links/Rechts-Analyse","Quellennachweis je Nachricht"], locked:["Politik & Wirtschaft Deutschland","Börsennachrichten International","Börsennachrichten Deutschland"], featured:false },
                { name:"Standard", price:"€9,90", period:"pro Monat · jährlich €99", features:["Alle Free-Features","Politik & Wirtschaft Deutschland","Börsennachrichten International","Börsennachrichten Deutschland","Tägliches E-Mail-Briefing","Archiv (letzte 30 Tage)"], locked:["B2B-Teamzugang"], featured:true },
                { name:"Business", price:"€149", period:"pro Monat · bis 15 Nutzer", features:["Alle Standard-Features","Bis 15 Nutzer inklusive","Vollständiges Archiv","Team-Dashboard","White-Label-Option","Dedizierter Support","Custom Quellen-Sets"], locked:[], featured:false },
              ].map(plan => (
                <div key={plan.name} style={{ background: plan.featured ? "#0D1B3E" : "#fff", padding:"44px 36px", display:"flex", flexDirection:"column" }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", color: plan.featured ? "rgba(255,255,255,0.35)" : "#B0B0C0", marginBottom:20 }}>
                    {plan.featured ? "Empfohlen " : ""}<span style={plan.featured ? { background:"#C9933A", color:"#fff", padding:"2px 8px", borderRadius:100, fontSize:9 } : {}}>{plan.featured ? "Beliebt" : ""}</span>
                  </div>
                  <div style={{ fontFamily:"'Syne', sans-serif", fontSize:22, fontWeight:800, color: plan.featured ? "#fff" : "#0D1B3E", marginBottom:8 }}>{plan.name}</div>
                  <div style={{ fontFamily:"'Syne', sans-serif", fontSize:44, fontWeight:800, color: plan.featured ? "#C9933A" : "#0D1B3E", letterSpacing:"-0.03em", lineHeight:1, margin:"16px 0 4px" }}>{plan.price}</div>
                  <div style={{ fontSize:13, color: plan.featured ? "rgba(255,255,255,0.35)" : "#B0B0C0", marginBottom:28 }}>{plan.period}</div>
                  <div style={{ height:1, background: plan.featured ? "rgba(255,255,255,0.1)" : "rgba(13,27,62,0.08)", marginBottom:24 }} />
                  <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
                    {plan.features.map(f => <div key={f} style={{ display:"flex", gap:8, fontSize:13, color: plan.featured ? "rgba(255,255,255,0.75)" : "#1A1A2A", fontWeight:300 }}><span>✅</span>{f}</div>)}
                    {plan.locked.map(f => <div key={f} style={{ display:"flex", gap:8, fontSize:13, color: plan.featured ? "rgba(255,255,255,0.25)" : "#B0B0C0", fontWeight:300 }}><span>🔒</span>{f}</div>)}
                  </div>
                  <button style={{ marginTop:28, padding:"14px 24px", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit", border:"none", background: plan.featured ? "#C9933A" : "transparent", color: plan.featured ? "#fff" : "#0D1B3E", borderWidth: plan.featured ? 0 : 1.5, borderStyle:"solid", borderColor:"rgba(13,27,62,0.2)" }}>
                    {plan.name === "Free" ? "Kostenlos starten" : plan.name === "Standard" ? "Jetzt abonnieren" : "Demo anfragen"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background:"#080F22", padding:"56px 64px 40px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:32, marginBottom:40 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <svg width="24" height="24" viewBox="0 0 68 68" fill="none"><polygon points="5,8 34,60 34,8" fill="#1E3A6E"/><polygon points="34,8 34,60 63,8" fill="#C9933A"/><rect x="33" y="8" width="2" height="52" fill="#080F22"/><circle cx="34" cy="6" r="3" fill="#C9933A"/></svg>
                <div style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:800, color:"#fff" }}>VERAX NEWS</div>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", maxWidth:240, lineHeight:1.6 }}>Die Nachricht. Beide Seiten. Dein Urteil.</div>
            </div>
            <div style={{ display:"flex", gap:48, flexWrap:"wrap" }}>
              {[["Produkt",["So funktioniert's","Kategorien","Preise","Business"]],["Rechtliches",["Datenschutz","Impressum","AGB","Cookies"]]].map(([title, links]) => (
                <div key={title}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:16 }}>{title}</div>
                  {links.map(l => <div key={l} style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:10 }}>{l}</div>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:24, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>© 2025 Verax News. Alle Rechte vorbehalten.</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>Täglich aktualisiert · <span style={{ color:"#C9933A" }}>4-Agenten KI</span> · DSGVO-konform</div>
          </div>
        </footer>
      </div>
    </>
  );
}
