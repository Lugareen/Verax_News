import Head from "next/head";
import Link from "next/link";

export default function Datenschutz() {
  return (
    <>
      <Head>
        <title>Datenschutzerklärung — Verax News</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight:"100vh", background:"#FAFAF7", fontFamily:"'DM Sans', sans-serif" }}>
        {/* Nav */}
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

        {/* Content */}
        <div style={{ maxWidth:800, margin:"0 auto", padding:"100px 32px 80px" }}>
          <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:36, fontWeight:800, color:"#0D1B3E", marginBottom:8 }}>Datenschutzerklärung</h1>
          <p style={{ fontSize:13, color:"#B0B0C0", marginBottom:48, fontFamily:"monospace" }}>Stand: 2025</p>

          <div style={{ display:"flex", flexDirection:"column", gap:32, fontSize:15, color:"#1A1A2A", lineHeight:1.8 }}>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>1. Datenschutz auf einen Blick</h2>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Allgemeine Hinweise</h3>
              <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>
            </section>

            <section>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Datenerfassung auf dieser Website</h3>
              <p><strong>Wer ist verantwortlich?</strong><br/>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Kontaktdaten siehe Impressum.</p>
              <p style={{ marginTop:12 }}><strong>Welche Rechte haben Sie?</strong><br/>Sie haben jederzeit das Recht auf Auskunft, Berichtigung oder Löschung Ihrer gespeicherten personenbezogenen Daten. Außerdem haben Sie das Recht auf Einschränkung der Verarbeitung sowie ein Beschwerderecht bei der zuständigen Aufsichtsbehörde.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>2. Hosting</h2>
              <p>Diese Website wird gehostet bei:</p>
              <div style={{ background:"#F2F0EB", borderRadius:8, padding:"16px 20px", marginTop:12, fontFamily:"monospace", fontSize:13 }}>
                Vercel Inc.<br/>
                440 N Barranca Avenue #4133<br/>
                Covina, CA 91723<br/>
                United States
              </div>
              <p style={{ marginTop:12 }}>Vercel verarbeitet Ihre Daten nur soweit zur Erfüllung seiner Leistungspflichten erforderlich. Details: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener" style={{ color:"#C9933A" }}>vercel.com/legal/privacy-policy</a></p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>3. Verantwortliche Stelle</h2>
              <div style={{ background:"#F2F0EB", borderRadius:8, padding:"16px 20px", fontFamily:"monospace", fontSize:13 }}>
                Lugareen GmbH<br/>
                Kaule 6a<br/>
                51429 Bergisch Gladbach<br/><br/>
                Telefon: +15122768037<br/>
                E-Mail: info@lugareen.de
              </div>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>4. Datenerfassung auf dieser Website</h2>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Cookies</h3>
              <p>Diese Website verwendet technisch notwendige Cookies für die Authentifizierung (Login-Funktion via Supabase). Diese Cookies sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden. Sie werden nach Ende der Sitzung automatisch gelöscht.</p>
              <p style={{ marginTop:12 }}>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technisch fehlerfreien Bereitstellung der Dienste).</p>

              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8, marginTop:20 }}>Registrierung & Nutzerkonto</h3>
              <p>Bei der Registrierung erheben wir folgende Daten: E-Mail-Adresse, Name (optional). Diese Daten werden bei Supabase Inc. (USA) gespeichert und ausschließlich zur Bereitstellung des Dienstes genutzt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>5. Auftragsverarbeiter — Supabase</h2>
              <p>Für die Nutzerverwaltung und Authentifizierung (Registrierung, Login) setzen wir den Dienst Supabase ein. Dabei werden personenbezogene Daten (E-Mail-Adresse, verschlüsseltes Passwort, Registrierungsdatum) auf Servern von Supabase gespeichert.</p>
              <div style={{ background:"#F2F0EB", borderRadius:8, padding:"16px 20px", marginTop:12, marginBottom:12, fontFamily:"monospace", fontSize:13 }}>
                Supabase Inc.<br/>
                970 Toa Payoh North, #07-04<br/>
                Singapore 318992<br/><br/>
                Datenschutz: <a href="https://supabase.com/privacy" target="_blank" rel="noopener" style={{ color:"#C9933A" }}>supabase.com/privacy</a>
              </div>
              <p><strong>Zweck:</strong> Nutzerverwaltung und Authentifizierung</p>
              <p style={{ marginTop:8 }}><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</p>
              <p style={{ marginTop:8 }}><strong>Datentransfer:</strong> Die Daten werden auf Servern in den USA und Singapur verarbeitet. Die Übertragung erfolgt auf Basis von Standardvertragsklauseln gemäß Art. 46 DSGVO.</p>
              <p style={{ marginTop:8 }}><strong>Auftragsverarbeitungsvertrag:</strong> Mit Supabase besteht ein Auftragsverarbeitungsvertrag (Data Processing Agreement) gemäß Art. 28 DSGVO.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>6. Widerspruch gegen Werbe-E-Mails</h2>
              <p>Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten zur Übersendung von nicht ausdrücklich angeforderter Werbung wird hiermit widersprochen. Die Betreiber behalten sich rechtliche Schritte im Falle der unverlangten Zusendung von Werbeinformationen vor.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>7. SSL-Verschlüsselung</h2>
              <p>Diese Seite nutzt SSL- bzw. TLS-Verschlüsselung (erkennbar am „https://" und dem Schloss-Symbol in der Browserzeile). Eine verschlüsselte Verbindung verhindert, dass Dritte die übertragenen Daten mitlesen können.</p>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, color:"#0D1B3E", marginBottom:12 }}>8. Ihre Rechte</h2>
              <p>Sie haben das Recht auf: Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21). Wenden Sie sich dazu an: info@lugareen.de</p>
            </section>

            <div style={{ fontSize:12, color:"#B0B0C0", borderTop:"1px solid rgba(13,27,62,0.08)", paddingTop:24 }}>
              Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener" style={{ color:"#C9933A" }}>e-recht24.de</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
