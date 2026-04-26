import Head from "next/head";
import Link from "next/link";

export default function Impressum() {
  return (
    <>
      <Head>
        <title>Impressum — Verax News</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight:"100vh", background:"#FAFAF7", fontFamily:"'DM Sans', sans-serif" }}>
        <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(250,250,247,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(13,27,62,0.08)", padding:"0 48px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:12, textDecoration:"none" }}>
            <svg width="28" height="28" viewBox="0 0 68 68" fill="none">
              <polygon points="5,8 34,60 34,8" fill="#0D1B3E"/>
              <polygon points="34,8 34,60 63,8" fill="#C9933A"/>
              <rect x="33" y="8" width="2" height="52" fill="#FAFAF7"/>
              <circle cx="34" cy="6" r="3" fill="#C9933A"/>
            </svg>
            <div>
              <div style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:800, color:"#0D1B3E" }}>VERAX</div>
              <div style={{ fontSize:8, letterSpacing:"0.38em", textTransform:"uppercase", color:"#C9933A" }}>NEWS</div>
            </div>
          </Link>
          <Link href="/" style={{ fontSize:14, color:"#6B6B80", textDecoration:"none" }}>← Zurück zur Startseite</Link>
        </nav>

        <div style={{ maxWidth:800, margin:"0 auto", padding:"100px 32px 80px" }}>
          <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:36, fontWeight:800, color:"#0D1B3E", marginBottom:48 }}>Impressum</h1>

          <div style={{ display:"flex", flexDirection:"column", gap:32, fontSize:15, color:"#1A1A2A", lineHeight:1.8 }}>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>Angaben gemäß § 5 TMG</h2>
              <div style={{ background:"#F2F0EB", borderRadius:8, padding:"20px 24px", fontSize:15 }}>
                <strong>Lugareen GmbH</strong><br/>
                Kaule 6a<br/>
                51429 Bergisch Gladbach<br/>
                Deutschland
              </div>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>Kontakt</h2>
              <div style={{ background:"#F2F0EB", borderRadius:8, padding:"20px 24px", fontSize:15 }}>
                Telefon: +15122768037<br/>
                E-Mail: <a href="mailto:info@veraxnews.de" style={{ color:"#C9933A" }}>info@veraxnews.de</a>
              </div>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>Verantwortlich für den Inhalt</h2>
              <p>Lugareen GmbH, Kaule 6a, 51429 Bergisch Gladbach</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>Streitschlichtung</h2>
              <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener" style={{ color:"#C9933A" }}>https://ec.europa.eu/consumers/odr/</a></p>
              <p style={{ marginTop:12 }}>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>Haftung für Inhalte</h2>
              <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>Urheberrecht</h2>
              <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
