import React, { useState, useEffect } from "react";
import Head from "next/head";
import { CATEGORIES } from "../lib/sources";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── HELPERS ──────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"40px 20px" }}>
      <div style={{ width:32, height:32, border:"3px solid rgba(13,27,62,0.08)", borderTop:"3px solid #C9933A", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <p style={{ color:"#B0B0C0", fontSize:12, fontFamily:"monospace" }}>Nachrichten werden geladen…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

function PerspectivePanel({ data, side, actualSources }) {
  if (!data) return null;
  const isLeft = side === "left";
  const color = isLeft ? "#3B5BDB" : "#C9933A";
  const bg = isLeft ? "#EEF2FF" : "#FFF4E6";
  const border = isLeft ? "rgba(59,91,219,0.12)" : "rgba(201,147,58,0.18)";
  const textColor = isLeft ? "#2a3d8f" : "#7a4e1a";

  // Echte Quellen aus RSS bevorzugen, KI-Angabe als Fallback
  const displaySources = actualSources?.length > 0
    ? actualSources
    : (data.sources_used || []).filter(s =>
        ["Spiegel","FAZ","taz","Guardian","NZZ","Welt","SZ","BBC","Zeit","Bloomberg",
         "Reuters","Handelsblatt","Le Monde","Telegraph","Washington Post",
         "New York Times","Financial Times","Tagesschau","Deutschlandfunk",
         "Süddeutsche Zeitung","Focus Online","Spiegel Online","Deutsche Welle",
         "Al Jazeera","NPR","Wall Street Journal"].includes(s)
      );

  return (
    <div style={{ borderRadius:10, padding:20, background:bg, border:`1px solid ${border}`, display:"flex", flexDirection:"column", gap:10, flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color }}>{isLeft ? "◀ Links geprägte Medien" : "Konservativ geprägte Medien ▶"}</span>
        {displaySources.length > 0 && (
          <span style={{ fontSize:10, color:"#B0B0C0", marginLeft:"auto" }}>{displaySources.join(" · ")}</span>
        )}
      </div>
      {data.key_argument && (
        <div style={{ fontSize:13, fontStyle:"italic", fontWeight:500, color, borderLeft:`3px solid ${color}`, paddingLeft:10, lineHeight:1.5 }}>
          „{data.key_argument}"
        </div>
      )}
      {(data.paragraphs || []).map((p, i) => (
        <p key={i} style={{ fontSize:13, lineHeight:1.75, fontWeight:300, margin:0, color:textColor }}>{p}</p>
      ))}
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
    <div className="vx-news-card" style={{ background:"#fff", borderBottom:"1px solid rgba(13,27,62,0.06)", display:"flex", flexDirection:"column", gap:20 }}>
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
        <div className="vx-perspectives">
          <PerspectivePanel data={item.left_perspective} side="left" actualSources={item.actual_sources?.left} />
          <PerspectivePanel data={item.right_perspective} side="right" actualSources={item.actual_sources?.right} />
        </div>
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
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/briefing?categoryId=${cat.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || json.error || "Fehler");
        setData(json.data);
        setState("done");
      } catch(e) {
        setError(e.message);
        setState("error");
      }
    };
    load();
  }, [cat.id]);

  return (
    <div style={{ background:"#fff", border:"1px solid rgba(13,27,62,0.09)", marginBottom:2 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 40px", borderBottom:"1px solid rgba(13,27,62,0.06)", background:`linear-gradient(135deg, ${cat.bgColor}60, #fff)` }}>
        <div>
          <div style={{ fontSize:10, color:cat.accentColor, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:4 }}>{cat.label}</div>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#0D1B3E", fontFamily:"'Playfair Display', Georgia, serif", display:"flex", alignItems:"center", gap:10, margin:0 }}>
            {cat.icon} {cat.sub}
          </h2>
        </div>
        {state === "done" && data && (
          <div style={{ fontSize:11, color:"#B0B0C0", fontFamily:"monospace", textAlign:"right" }}>
            Stand: {new Date(data.generated_at).toLocaleString("de-DE")}<br/>
            <span style={{ fontSize:10 }}>Täglich aktualisiert um 06:00 Uhr</span>
          </div>
        )}
      </div>
      {state === "loading" && <Spinner />}
      {state === "error" && (
        <div style={{ padding:"24px 40px" }}>
          <div style={{ background:"rgba(201,147,58,0.06)", border:"1px solid rgba(201,147,58,0.2)", borderRadius:10, padding:"20px 24px", textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:600, color:"#0D1B3E", marginBottom:8 }}>Briefing wird vorbereitet</div>
            <div style={{ fontSize:13, color:"#6B6B80", lineHeight:1.6 }}>{error}</div>
          </div>
        </div>
      )}
      {state === "done" && data && (
        <div>
          <div style={{ padding:"10px 40px 4px", fontSize:11, color:"#B0B0C0", fontFamily:"monospace" }}>
            Top 3 meistberichtete Themen der letzten 24h
          </div>
          {data.news.map((item, i) => <NewsCard key={i} item={item} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────
function AuthModal({ tab, onClose, onSwitch, onLogin }) {
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isRegister = tab === "register";

  const inputStyle = { width:"100%", padding:"12px 14px", border:"1.5px solid rgba(13,27,62,0.12)", borderRadius:8, fontSize:14, fontFamily:"'DM Sans', sans-serif", color:"#1A1A2A", background:"#FAFAF7", outline:"none" };

  const handleRegister = async () => {
    if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    if (password.length < 8) { setError("Passwort muss mindestens 8 Zeichen haben."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, plan } }
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setMessage("✅ Bitte bestätige deine E-Mail-Adresse – dann bist du dabei!");
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError("E-Mail oder Passwort falsch."); return; }
    onLogin();
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Bitte zuerst E-Mail-Adresse eingeben."); return; }
    await supabase.auth.resetPasswordForEmail(email);
    setMessage("📧 Wir haben dir einen Reset-Link geschickt.");
  };

  const resetState = () => { setError(""); setMessage(""); };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(13,27,62,0.65)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:24, backdropFilter:"blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:420, overflow:"hidden", boxShadow:"0 24px 64px rgba(13,27,62,0.2)" }}>

        {/* Header */}
        <div style={{ background:"#0D1B3E", padding:"28px 32px 24px", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <svg width="22" height="22" viewBox="0 0 68 68" fill="none">
              <polygon points="5,8 34,60 34,8" fill="#1E3A6E"/>
              <polygon points="34,8 34,60 63,8" fill="#C9933A"/>
              <rect x="33" y="8" width="2" height="52" fill="#0D1B3E"/>
              <circle cx="34" cy="6" r="3" fill="#C9933A"/>
            </svg>
            <span style={{ fontFamily:"'Syne', sans-serif", fontSize:15, fontWeight:800, color:"#fff" }}>VERAX NEWS</span>
          </div>
          <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.08)", borderRadius:8, padding:3 }}>
            <button onClick={() => { onSwitch("register"); resetState(); }} style={{ flex:1, padding:8, borderRadius:6, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:isRegister?"#C9933A":"transparent", color:isRegister?"#fff":"rgba(255,255,255,0.45)", transition:"all .2s" }}>Registrieren</button>
            <button onClick={() => { onSwitch("login"); resetState(); }} style={{ flex:1, padding:8, borderRadius:6, border:"none", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:!isRegister?"#C9933A":"transparent", color:!isRegister?"#fff":"rgba(255,255,255,0.45)", transition:"all .2s" }}>Anmelden</button>
          </div>
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"rgba(255,255,255,0.1)", border:"none", width:28, height:28, borderRadius:"50%", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ padding:"28px 32px" }}>
          {error && <div style={{ background:"#FEE2E2", border:"1px solid rgba(185,28,28,0.2)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#B91C1C", marginBottom:16 }}>{error}</div>}
          {message && <div style={{ background:"#D4EDDA", border:"1px solid rgba(26,122,74,0.2)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#1A7A4A", marginBottom:16 }}>{message}</div>}

          {isRegister ? (
            <>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:"#0D1B3E", marginBottom:4 }}>Konto erstellen</div>
              <div style={{ fontSize:13, color:"#6B6B80", marginBottom:22, fontWeight:300 }}>Kostenlos · Keine Kreditkarte erforderlich</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6B6B80", marginBottom:5 }}>Vor- und Nachname</div>
                  <input type="text" placeholder="Max Mustermann" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6B6B80", marginBottom:5 }}>E-Mail-Adresse</div>
                  <input type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6B6B80", marginBottom:5 }}>Passwort</div>
                  <input type="password" placeholder="Mindestens 8 Zeichen" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop:18, display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { id:"free", label:"Kostenlos starten", desc:"Alle 4 Themen · Links/Rechts-Analyse · 1× täglich", price:"€0" },
                  { id:"premium", label:"Premium", desc:"Folgt bald — aktuell noch nicht verfügbar", price:"€1,99/Mo", badge:"BALD", disabled:true },
                ].map(p => (
                  <div key={p.id} onClick={() => !p.disabled && setPlan(p.id)} style={{ border:`2px solid ${p.disabled ? "rgba(13,27,62,0.06)" : plan===p.id?(p.id==="premium"?"#C9933A":"#0D1B3E"):"rgba(13,27,62,0.12)"}`, borderRadius:10, padding:"11px 14px", cursor: p.disabled ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:12, background: p.disabled ? "rgba(13,27,62,0.02)" : plan===p.id?(p.id==="premium"?"rgba(201,147,58,0.04)":"rgba(13,27,62,0.03)"):"transparent", opacity: p.disabled ? 0.5 : 1, transition:"all .2s" }}>
                    <div style={{ width:17, height:17, borderRadius:"50%", border:`2px solid ${p.disabled ? "rgba(13,27,62,0.15)" : plan===p.id?(p.id==="premium"?"#C9933A":"#0D1B3E"):"rgba(13,27,62,0.2)"}`, background: !p.disabled && plan===p.id?(p.id==="premium"?"#C9933A":"#0D1B3E"):"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {!p.disabled && plan===p.id && <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }} />}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: p.disabled ? "#B0B0C0" : "#0D1B3E" }}>{p.label} {p.badge && <span style={{ background: p.disabled ? "rgba(13,27,62,0.08)" : "rgba(201,147,58,0.15)", color: p.disabled ? "#B0B0C0" : "#C9933A", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:100, letterSpacing:"0.1em", verticalAlign:"middle" }}>{p.badge}</span>}</div>
                      <div style={{ fontSize:11, color: p.disabled ? "#B0B0C0" : "#6B6B80", fontWeight:300 }}>{p.desc}</div>
                    </div>
                    <div style={{ marginLeft:"auto", fontSize:13, fontWeight:700, color:p.id==="premium"?"#C9933A":"#0D1B3E" }}>{p.price}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleRegister} disabled={loading} style={{ width:"100%", marginTop:18, padding:13, background:loading?"#B0B0C0":"#0D1B3E", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:500, cursor:loading?"default":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {loading ? "Wird registriert…" : "Jetzt registrieren →"}
              </button>
              <div style={{ fontSize:11, color:"#B0B0C0", textAlign:"center", marginTop:10, lineHeight:1.6 }}>
                Mit der Registrierung stimmst du unseren AGB und der Datenschutzerklärung zu.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:"#0D1B3E", marginBottom:4 }}>Willkommen zurück</div>
              <div style={{ fontSize:13, color:"#6B6B80", marginBottom:22, fontWeight:300 }}>Melde dich mit deinem Konto an</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6B6B80", marginBottom:5 }}>E-Mail-Adresse</div>
                  <input type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6B6B80" }}>Passwort</div>
                    <button onClick={handleForgotPassword} style={{ background:"none", border:"none", color:"#C9933A", fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Vergessen?</button>
                  </div>
                  <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={inputStyle} />
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading} style={{ width:"100%", marginTop:20, padding:13, background:loading?"#B0B0C0":"#0D1B3E", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:500, cursor:loading?"default":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {loading ? "Wird angemeldet…" : "Anmelden →"}
              </button>
              <div style={{ textAlign:"center", marginTop:18, fontSize:13, color:"#6B6B80" }}>
                Noch kein Konto?{" "}
                <button onClick={() => { onSwitch("register"); resetState(); }} style={{ background:"none", border:"none", color:"#0D1B3E", fontWeight:500, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>Jetzt registrieren</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── COOKIE BANNER ────────────────────────────────────────────────────────
function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const accepted = localStorage.getItem("verax_cookies_accepted");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("verax_cookies_accepted", "1");
    setVisible(false);
  };

  const decline = () => {
    // Nur technisch notwendige Cookies erlauben
    localStorage.setItem("verax_cookies_accepted", "necessary");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9999, background:"#0D1B3E", borderTop:"2px solid #C9933A", padding:"20px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
      <p style={{ fontSize:13, color:"rgba(255,255,255,0.8)", margin:0, maxWidth:740, lineHeight:1.7 }}>
        <strong style={{ color:"#fff" }}>Wir verwenden Cookies.</strong>{" "}
        Verax News nutzt ausschliesslich technisch notwendige Cookies, die für den Betrieb der Website und die Login-Funktion erforderlich sind. Diese Cookies speichern keine personenbezogenen Daten zu Werbezwecken.{" "}
        <a href="/datenschutz" style={{ color:"#C9933A", textDecoration:"underline" }}>Mehr erfahren</a>
      </p>
      <div style={{ display:"flex", gap:10, flexShrink:0 }}>
        <button onClick={decline} style={{ background:"transparent", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>
          Nur notwendige
        </button>
        <button onClick={accept} style={{ background:"#C9933A", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>
          Akzeptieren
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function Home() {
  const today = new Date().toLocaleDateString("de-DE", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const [modal, setModal] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Verhindert SSR-Mismatch — rendert Layout erst nach Hydration
  useEffect(() => { setMounted(true); }, []);

  // Session beim Laden prüfen + auf Änderungen hören
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isLoggedIn = !!user;
  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mein Konto";

  // Warte bis Seite im Browser gerendert ist UND Auth-Status bekannt
  if (!mounted || authLoading) {
    return (
      <div style={{ minHeight:"100vh", background:"#FAFAF7", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid rgba(13,27,62,0.08)", borderTop:"3px solid #C9933A", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Verax News — Eine Nachricht. Zwei Seiten. Dein Urteil.</title>
        <meta name="description" content="Tägliches Nachrichten-Briefing für Führungskräfte — objektiv, ausgewogen, mit Links & Rechts Perspektiven" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight:"100vh", background:"#FAFAF7", fontFamily:"'DM Sans', sans-serif" }}>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

          /* ── MOBILE OPTIMIERUNG ── */

          /* Nav */
          .vx-nav { padding: 0 48px; }
          .vx-nav-links { display: flex; gap: 24px; align-items: center; }
          .vx-nav-textlinks { display: flex; gap: 24px; }

          /* Hero */
          .vx-hero { padding: 140px 64px 80px; }
          .vx-hero-logged { padding: 96px 64px 40px; }
          .vx-stats { display: flex; gap: 48px; flex-wrap: wrap; }

          /* Sections */
          .vx-section { padding: 100px 64px; }
          .vx-section-sm { padding: 80px 64px; }
          .vx-problem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
          .vx-methodik-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; }
          .vx-pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; }

          /* Briefing */
          .vx-briefing { padding: 48px 64px 80px; }
          .vx-briefing-noauth { padding: 80px 64px; }
          .vx-nav-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }
          .vx-cat-tab { padding: 9px 18px; background: #fff; border: 1px solid rgba(13,27,62,0.12); border-radius: 8px; font-size: 13px; font-weight: 500; color: #0D1B3E; text-decoration: none; white-space: nowrap; }
          .vx-cat-tab:hover { background: #0D1B3E; color: #fff; }

          /* News Cards */
          .vx-news-card { padding: 32px 40px; }
          .vx-perspectives { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

          /* Sources */
          .vx-sources-list { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }

          /* Footer */
          .vx-footer { padding: 56px 64px 40px; }
          .vx-footer-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 32px; }
          .vx-footer-links { display: flex; gap: 48px; flex-wrap: wrap; }

          /* ── TABLET (max 900px) ── */
          @media (max-width: 900px) {
            .vx-nav { padding: 0 24px; }
            .vx-nav-textlinks { display: none; }
            .vx-hero { padding: 100px 24px 60px; }
            .vx-hero-logged { padding: 80px 24px 32px; }
            .vx-stats { gap: 24px; }
            .vx-section { padding: 64px 24px; }
            .vx-section-sm { padding: 48px 24px; }
            .vx-problem-grid { grid-template-columns: 1fr; gap: 40px; }
            .vx-methodik-grid { grid-template-columns: 1fr; }
            .vx-pricing-grid { grid-template-columns: 1fr; }
            .vx-briefing { padding: 32px 24px 60px; }
            .vx-briefing-noauth { padding: 60px 24px; }
            .vx-news-card { padding: 24px; }
            .vx-footer { padding: 40px 24px; }
            .vx-footer-links { gap: 24px; }
          }

          /* ── MOBILE (max 600px) ── */
          @media (max-width: 600px) {
            .vx-nav { padding: 0 16px; height: 56px; }
            .vx-nav-links { gap: 8px; }
            .vx-hero { padding: 88px 16px 48px; }
            .vx-hero-logged { padding: 72px 16px 24px; }
            .vx-stats { gap: 16px; }
            .vx-stats > div { min-width: 80px; }
            .vx-section { padding: 48px 16px; }
            .vx-section-sm { padding: 40px 16px; }
            .vx-problem-grid { grid-template-columns: 1fr; gap: 32px; }
            .vx-methodik-grid { grid-template-columns: 1fr; }
            .vx-pricing-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
            .vx-briefing { padding: 16px 16px 48px; }
            .vx-briefing-noauth { padding: 48px 16px; }
            .vx-nav-tabs { gap: 6px; position: static !important; }
            .vx-cat-tab { padding: 8px 12px; font-size: 12px; }
            .vx-news-card { padding: 20px 16px; }
            .vx-perspectives { grid-template-columns: 1fr; gap: 12px; }
            .vx-footer { padding: 32px 16px; }
            .vx-footer-top { flex-direction: column; }
            .vx-footer-links { flex-direction: column; gap: 24px; }
          }
        `}</style>

        {modal && <AuthModal tab={modal} onClose={() => setModal(null)} onSwitch={tab => setModal(tab)} onLogin={() => setModal(null)} />}

        {/* ── NAV ── */}
        <nav className="vx-nav" style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(250,250,247,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(13,27,62,0.08)", padding:"0 48px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
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
          <div className="vx-nav-textlinks" style={{ display:"flex", alignItems:"center", gap:24 }}>
            <a href="#briefing" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>Briefing</a>
            <a href="#methodik" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>Methodik</a>
            <a href="#preise" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>Preise</a>
            {authLoading ? (
              <div style={{ width:80, height:36, background:"rgba(13,27,62,0.06)", borderRadius:8 }} />
            ) : isLoggedIn ? (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:"#C9933A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff" }}>{userInitial}</div>
                <span style={{ fontSize:13, color:"#0D1B3E", fontWeight:500 }}>{userName}</span>
                <button onClick={handleLogout} style={{ background:"none", border:"none", fontSize:12, color:"#B0B0C0", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Abmelden</button>
              </div>
            ) : (
              <>
                <button onClick={() => setModal("login")} style={{ background:"transparent", color:"#0D1B3E", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:500, border:"1.5px solid rgba(13,27,62,0.18)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Anmelden</button>
                <button onClick={() => setModal("register")} style={{ background:"#0D1B3E", color:"#fff", padding:"10px 22px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Kostenlos registrieren</button>
              </>
            )}
          </div>
        </nav>

        {/* ── HERO: unterschiedlich je nach Login-Status ── */}
        {isLoggedIn ? (
          <section className="vx-hero-logged" style={{ background:"linear-gradient(160deg, #FAFAF7 60%, #F2F0EB 100%)", borderBottom:"1px solid rgba(13,27,62,0.08)" }}>
            <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#F5E8D0", border:"1px solid rgba(201,147,58,0.3)", padding:"5px 12px", borderRadius:100, fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:"#C9933A", marginBottom:12 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#C9933A", animation:"pulse 2s infinite" }} />
                  Tägliches Nachrichten-Briefing
                </div>
                <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(24px,3vw,40px)", fontWeight:800, lineHeight:1.1, color:"#0D1B3E", letterSpacing:"-0.02em" }}>
                  Eine Nachricht. <em style={{ fontFamily:"'Playfair Display', serif", fontStyle:"italic", color:"#C9933A", fontWeight:600 }}>Zwei Seiten.</em> Dein Urteil.
                </h1>
              </div>
              <div style={{ fontSize:13, color:"#6B6B80", fontFamily:"monospace", textAlign:"right" }}>
                {today}<br/>
                <span style={{ fontSize:11 }}>Top 3 Themen je Kategorie</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="vx-hero" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", position:"relative", overflow:"hidden", background:"linear-gradient(160deg, #FAFAF7 60%, #F2F0EB 100%)" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(13,27,62,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(13,27,62,0.04) 1px,transparent 1px)", backgroundSize:"60px 60px", zIndex:0 }} />
            <div style={{ position:"absolute", top:-100, right:-100, width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,147,58,0.07) 0%,transparent 70%)", zIndex:0 }} />
            <div style={{ position:"relative", zIndex:1, maxWidth:800 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#F5E8D0", border:"1px solid rgba(201,147,58,0.3)", padding:"6px 14px", borderRadius:100, fontSize:11, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:"#C9933A", marginBottom:32 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9933A", animation:"pulse 2s infinite" }} />
                Tägliches Nachrichten-Briefing
              </div>
              <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(40px,6vw,72px)", fontWeight:800, lineHeight:1.0, color:"#0D1B3E", letterSpacing:"-0.03em", marginBottom:28 }}>
                Eine Nachricht.<br />
                <em style={{ fontFamily:"'Playfair Display', serif", fontStyle:"italic", color:"#C9933A", fontWeight:600 }}>Zwei Seiten.</em><br />
                Dein Urteil.
              </h1>
              <p style={{ fontSize:18, fontWeight:300, color:"#6B6B80", lineHeight:1.65, maxWidth:560, marginBottom:48 }}>
                Die meisten Medien haben eine Meinung. Verax News auch – nämlich keine. Täglich die wichtigsten Wirtschafts- und Politiknachrichten, aus linker und rechter Perspektive. Für Entscheider, die selbst denken.
              </p>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                <button onClick={() => setModal("register")} style={{ background:"#0D1B3E", color:"#fff", padding:"16px 36px", borderRadius:10, fontSize:15, fontWeight:500, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Kostenlos registrieren →</button>
                <button onClick={() => setModal("login")} style={{ background:"transparent", color:"#0D1B3E", padding:"16px 28px", borderRadius:10, fontSize:15, fontWeight:400, border:"1.5px solid rgba(13,27,62,0.2)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Bereits Konto? Anmelden</button>
              </div>
              <div className="vx-stats" style={{ marginTop:64, paddingTop:40, borderTop:"1px solid rgba(13,27,62,0.09)" }}>
                {[["3×","Top-Nachrichten pro Kategorie"],["2×","Perspektiven: Links & Rechts"],["10+","Verifizierte Quellen"],["5min","Täglicher Zeitaufwand"]].map(([num, label]) => (
                  <div key={num}>
                    <div style={{ fontFamily:"'Syne', sans-serif", fontSize:32, fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em" }}>{num}</div>
                    <div style={{ fontSize:13, color:"#6B6B80", marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── LIVE BRIEFING ── */}
        <section id="briefing" className={isLoggedIn ? "vx-briefing" : "vx-briefing-noauth"} style={{ background:"#F2F0EB" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>

            {/* Navigations-Tabs — nur für eingeloggte Nutzer */}
            {isLoggedIn && (
              <div className="vx-nav-tabs">
                {[
                  { id:"cat-politik-international", label:"🌍 Politik International" },
                  { id:"cat-politik-deutschland",   label:"🇩🇪 Politik Deutschland" },
                  { id:"cat-boerse-international",  label:"📈 Börse International" },
                  { id:"cat-boerse-deutschland",    label:"🏦 Börse Deutschland" },
                ].map(tab => (
                  <a key={tab.id} href={`#${tab.id}`}
                    style={{ padding:"9px 18px", background:"#fff", border:"1px solid rgba(13,27,62,0.12)", borderRadius:8, fontSize:13, fontWeight:500, color:"#0D1B3E", textDecoration:"none", whiteSpace:"nowrap", boxShadow:"0 1px 4px rgba(13,27,62,0.06)" }}>
                    {tab.label}
                  </a>
                ))}
              </div>
            )}

            {/* Politik International — immer sichtbar */}
            <div id="cat-politik-international" style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", fontFamily:"monospace", color:"#B0B0C0", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} /> Politik & Wirtschaft International <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} />
            </div>
            <CategoryPanel cat={CATEGORIES[0]} />

            {/* Restliche Kategorien — nur nach Anmeldung */}
            {isLoggedIn ? (
              <>
                <div id="cat-politik-deutschland" style={{ marginTop:48, fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", fontFamily:"monospace", color:"#B0B0C0", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} /> Politik & Wirtschaft Deutschland <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} />
                </div>
                <CategoryPanel cat={CATEGORIES[1]} />
                <div id="cat-boerse-international" style={{ marginTop:48, fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", fontFamily:"monospace", color:"#B0B0C0", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} /> Börsennachrichten International <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} />
                </div>
                <CategoryPanel cat={CATEGORIES[2]} />
                <div id="cat-boerse-deutschland" style={{ marginTop:48, fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", fontFamily:"monospace", color:"#B0B0C0", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} /> Börsennachrichten Deutschland <span style={{ flex:1, height:1, background:"rgba(13,27,62,0.1)" }} />
                </div>
                <CategoryPanel cat={CATEGORIES[3]} />
              </>
            ) : (
              <div style={{ marginTop:32, display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { icon:"🇩🇪", label:"Politik & Wirtschaft Deutschland" },
                  { icon:"📈", label:"Börsennachrichten International" },
                  { icon:"📉", label:"Börsennachrichten Deutschland" },
                ].map(({ icon, label }) => (
                  <div key={label} style={{ background:"#fff", border:"1.5px dashed rgba(13,27,62,0.15)", borderRadius:12, padding:"32px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                      <div style={{ width:48, height:48, borderRadius:"50%", background:"#F5E8D0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{icon}</div>
                      <div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:"#0D1B3E", marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:13, color:"#6B6B80", fontWeight:300 }}>Top 3 Nachrichten täglich · Links/Rechts-Analyse</div>
                      </div>
                    </div>
                    <button onClick={() => setModal("register")} style={{ background:"#0D1B3E", color:"#fff", padding:"11px 24px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap", flexShrink:0 }}>
                      🔓 Kostenlos anmelden
                    </button>
                  </div>
                ))}
                <div style={{ textAlign:"center", padding:"8px 0" }}>
                  <span style={{ fontSize:13, color:"#6B6B80" }}>Bereits registriert? </span>
                  <button onClick={() => setModal("login")} style={{ background:"none", border:"none", color:"#0D1B3E", fontWeight:600, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", textDecoration:"underline" }}>Jetzt anmelden</button>
                </div>
              </div>
            )}

            <div style={{ marginTop:32, padding:"16px 24px", background:"rgba(13,27,62,0.04)", border:"1px solid rgba(13,27,62,0.08)", borderRadius:10, fontSize:12, color:"#6B6B80", lineHeight:1.8 }}>
              <strong style={{ color:"#0D1B3E" }}>Quellen:</strong> Spiegel, SZ, taz, FAZ, Welt, Focus, Reuters, BBC, Handelsblatt, NZZ, Guardian, Bloomberg, Le Monde, Daily Telegraph · Themenauswahl nach Medienhäufigkeit · Perspektiven basieren auf tatsächlichen Artikeln
            </div>
          </div>
        </section>

        {/* ── PROBLEM + METHODIK: vor Briefing wenn nicht eingeloggt ── */}
        {!isLoggedIn && (
          <>
            {/* ── PROBLEM ── */}
            <section className="vx-section" style={{ background:"#0D1B3E", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:500, height:500, background:"radial-gradient(circle,rgba(201,147,58,0.1) 0%,transparent 65%)" }} />
              <div className="vx-problem-grid" style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto" }}>
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
            <section id="methodik" className="vx-section" style={{ background:"#fff" }}>
              <div style={{ maxWidth:1100, margin:"0 auto" }}>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Unser Ansatz</div>
                <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:16 }}>Wir scannen. Wir vergleichen. Du entscheidest.</h2>
                <p style={{ fontSize:17, color:"#6B6B80", lineHeight:1.65, maxWidth:580, fontWeight:300, marginBottom:64 }}>Täglich um 6:00 Uhr werden die wichtigsten Nachrichten aus über 40 Quellen ausgewertet — strukturiert, ausgewogen und auf das Wesentliche reduziert.</p>
                <div className="vx-methodik-grid">
                  {[
                    ["01","🗞️","Die relevantesten Themen","Täglich werden hunderte Artikel der letzten 24 Stunden ausgewertet. Ausgewählt werden die Themen, über die die meisten unabhängigen Quellen berichten."],
                    ["02","⚖️","Fakten zuerst","Für jedes Thema wird eine objektive Zusammenfassung erstellt — ausschliesslich auf Basis belegter Informationen. Keine Wertungen, keine Spekulationen."],
                    ["03","📰","Beide Seiten im Vergleich","Links geprägte und konservativ geprägte Medien werden getrennt analysiert. Du siehst, welche Aspekte jede Seite betont."],
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
          </>
        )}

        {/* ── PROBLEM + METHODIK: nach Briefing wenn eingeloggt ── */}
        {isLoggedIn && (
          <>
            <section className="vx-section" style={{ background:"#0D1B3E", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:500, height:500, background:"radial-gradient(circle,rgba(201,147,58,0.1) 0%,transparent 65%)" }} />
              <div className="vx-problem-grid" style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto" }}>
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

            <section id="methodik" className="vx-section" style={{ background:"#fff" }}>
              <div style={{ maxWidth:1100, margin:"0 auto" }}>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Unser Ansatz</div>
                <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:16 }}>Wir scannen. Wir vergleichen. Du entscheidest.</h2>
                <p style={{ fontSize:17, color:"#6B6B80", lineHeight:1.65, maxWidth:580, fontWeight:300, marginBottom:64 }}>Täglich um 6:00 Uhr werden die wichtigsten Nachrichten aus über 40 Quellen ausgewertet — strukturiert, ausgewogen und auf das Wesentliche reduziert.</p>
                <div className="vx-methodik-grid">
                  {[
                    ["01","🗞️","Die relevantesten Themen","Täglich werden hunderte Artikel der letzten 24 Stunden ausgewertet. Ausgewählt werden die Themen, über die die meisten unabhängigen Quellen berichten."],
                    ["02","⚖️","Fakten zuerst","Für jedes Thema wird eine objektive Zusammenfassung erstellt — ausschliesslich auf Basis belegter Informationen. Keine Wertungen, keine Spekulationen."],
                    ["03","📰","Beide Seiten im Vergleich","Links geprägte und konservativ geprägte Medien werden getrennt analysiert. Du siehst, welche Aspekte jede Seite betont."],
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
          </>
        )}

        {/* ── PRICING ── */}
        <section id="preise" className="vx-section" style={{ background:"#F2F0EB" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:"#C9933A", marginBottom:16 }}>Preise</div>
            <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#0D1B3E", letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:16 }}>Einfach. Transparent. Fair.</h2>
            <div className="vx-pricing-grid" style={{ marginTop:48 }}>
              {[
                { name:"Free", price:"€0", period:"für immer kostenlos", features:["Politik & Wirtschaft International","Top 3 Nachrichten täglich","Links/Rechts-Analyse","Quellennachweis je Nachricht"], locked:["Politik & Wirtschaft Deutschland","Börsennachrichten International","Börsennachrichten Deutschland"], featured:false },
                { name:"Premium", price:"€1,99", period:"pro Monat · jährlich €19,99", features:["Alle Free-Features","Aktualisierung stündlich","Politik & Wirtschaft Deutschland","Börsennachrichten International","Börsennachrichten Deutschland","Täglicher Podcast (5 Min.)","Archiv (letzte 30 Tage)"], locked:["B2B-Teamzugang"], featured:true },
                { name:"Business", price:"€149", period:"pro Monat · bis 15 Nutzer", features:["Alle Premium-Features","Bis 15 Nutzer inklusive","Vollständiges Archiv","Team-Dashboard","White-Label-Option","Dedizierter Support","Custom Quellen-Sets"], locked:[], featured:false },
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
                  <button
                    disabled={plan.name !== "Free"}
                    onClick={() => plan.name === "Free" ? setModal("register") : null}
                    style={{ marginTop:28, padding:"14px 24px", borderRadius:8, fontSize:14, fontWeight:500, cursor: plan.name === "Free" ? "pointer" : "not-allowed", fontFamily:"inherit", border:"none", background: plan.featured ? "rgba(201,147,58,0.4)" : "rgba(13,27,62,0.1)", color: plan.featured ? "#fff" : "#B0B0C0", opacity: plan.name === "Free" ? 1 : 0.7 }}>
                    {plan.name === "Free" ? "Kostenlos registrieren" : "🔜 Folgt bald"}
                  </button>
                  {plan.name !== "Free" && (
                    <div style={{ marginTop:8, textAlign:"center", fontSize:11, color: plan.featured ? "rgba(255,255,255,0.4)" : "#B0B0C0" }}>
                      Bezahlfunktion wird in Kürze verfügbar
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="vx-footer" style={{ background:"#080F22" }}>
          <div className="vx-footer-top">
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <svg width="24" height="24" viewBox="0 0 68 68" fill="none"><polygon points="5,8 34,60 34,8" fill="#1E3A6E"/><polygon points="34,8 34,60 63,8" fill="#C9933A"/><rect x="33" y="8" width="2" height="52" fill="#080F22"/><circle cx="34" cy="6" r="3" fill="#C9933A"/></svg>
                <div style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:800, color:"#fff" }}>VERAX NEWS</div>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", maxWidth:240, lineHeight:1.6 }}>Eine Nachricht. Zwei Seiten. Dein Urteil.</div>
            </div>
            <div className="vx-footer-links">
              {[["Produkt",["So funktioniert's","Kategorien","Preise"]],["Rechtliches",["Datenschutz","Impressum"]]].map(([title, links]) => (
                <div key={title}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:16 }}>{title}</div>
                  {links.map(l => <a key={l} href={l === "Datenschutz" ? "/datenschutz" : l === "Impressum" ? "/impressum" : "#"} style={{ display:"block", fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:10, textDecoration:"none" }}>{l}</a>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:24, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>© 2025 Verax News. Alle Rechte vorbehalten.</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>Täglich aktualisiert · <span style={{ color:"#C9933A" }}>Automatisch kuratiert</span> · DSGVO-konform</div>
          </div>
        </footer>
        <CookieBanner />
      </div>
    </>
  );
}
