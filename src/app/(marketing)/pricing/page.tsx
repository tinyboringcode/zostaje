"use client";
import Link from "next/link";

const maxW: React.CSSProperties = { maxWidth: 880, margin: "0 auto", padding: "0 32px" };

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#999", textDecoration: "none", transition: "color 150ms" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#999")}>
      {children}
    </Link>
  );
}

const FREE_FEATURES = [
  "Kalkulator ZUS + podatek (na żywo)",
  "Ręczne dodawanie transakcji",
  "Podstawowy dashboard",
  "Local-first (IndexedDB)",
  "Szyfrowany skarbiec (AES-GCM)",
  "Eksport JSON",
  "Aplikacja PWA (offline)",
];

const PRO_FEATURES = [
  "Wszystko z planu Free",
  "Import CSV z banku",
  "Faktury PDF z logo",
  "Raporty roczne i miesięczne",
  "Wskaźniki finansowe (runway, marże)",
  "Auto-kategoryzacja (AI Ollama)",
  "Sync E2E między urządzeniami",
  "Budżety i limity kategorii",
  "Kontrahenci i CRM",
  "Integracja KSeF (e-faktury)",
  "Priorytetowe wsparcie",
  "Składki ZUS aktualizowane co rok",
];

export default function PricingPage() {
  return (
    <div style={{ background: "#0d0d0d", color: "#fff", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #1f1f1f", position: "sticky", top: 0, background: "#0d0d0d", zIndex: 50 }}>
        <div style={{ ...maxW, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", textDecoration: "none" }}>zostaje.</Link>
          <div className="hidden sm:flex" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <NavLink href="/download">Download</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/sync">Sync</NavLink>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/dashboard"
              style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#ccc", textDecoration: "none", padding: "6px 14px", border: "1px solid #333", borderRadius: 6, transition: "border-color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#666")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#333")}>
              Account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 0 64px", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW, textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
            Prosty cennik
          </h1>
          <p style={{ fontSize: 18, color: "#888", maxWidth: 420, margin: "0 auto" }}>
            Free zawsze darmowy. Pro dla tych, którzy chcą więcej.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section style={{ padding: "64px 0" }}>
        <div style={{ ...maxW }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto" }}>

            {/* Free */}
            <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: "36px 32px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Free</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 42, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff" }}>0 zł</span>
              </div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 28 }}>na zawsze</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1, marginBottom: 28 }}>
                {FREE_FEATURES.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ color: "#555", fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, color: "#888" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/download"
                style={{ display: "block", textAlign: "center", padding: "12px 0", background: "#1f1f1f", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, border: "1px solid #333" }}>
                Pobierz za darmo
              </Link>
            </div>

            {/* Pro */}
            <div style={{ background: "#1a1a2e", border: "1px solid #7c3aed", borderRadius: 10, padding: "36px 32px", display: "flex", flexDirection: "column", position: "relative" }}>
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", padding: "4px 14px", borderRadius: 20 }}>
                POPULARNE
              </div>
              <div style={{ fontSize: 11, color: "#9d7dff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 42, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff" }}>29 zł</span>
                <span style={{ fontSize: 14, color: "#666" }}>/mies.</span>
              </div>
              <div style={{ fontSize: 13, color: "#17c964", marginBottom: 28 }}>14 dni za darmo — karta nie wymagana</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1, marginBottom: 28 }}>
                {PRO_FEATURES.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ color: "#7c3aed", fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, color: "#ccc" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard"
                style={{ display: "block", textAlign: "center", padding: "12px 0", background: "#7c3aed", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                Zacznij 14 dni za darmo
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ maxWidth: 720, margin: "64px auto 0" }}>
            <p style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 32 }}>często zadawane pytania</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { q: "Czy mogę anulować w dowolnym momencie?", a: "Tak. Bez zobowiązań, bez ukrytych opłat. Anulujesz jednym kliknięciem." },
                { q: "Czy moje dane są bezpieczne?", a: "Aplikacja działa local-first — dane żyją zaszyfrowane (AES-GCM 256) na Twoim urządzeniu. Sync Pro używa szyfrowania E2E: serwer nigdy nie widzi Twoich danych." },
                { q: "Czy Free naprawdę jest darmowy na zawsze?", a: "Tak. Kalkulator, podstawowy dashboard i local-first skarbiec są i pozostaną bezpłatne." },
                { q: "Skąd biorą się dane o ZUS?", a: "Aktualizujemy składki co rok zgodnie z oficjalnymi komunikatami ZUS. Pro ma zawsze aktualne wartości." },
              ].map(({ q, a }, i, arr) => (
                <div key={q} style={{ padding: "22px 0", borderBottom: i < arr.length - 1 ? "1px solid #1f1f1f" : "none" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#fff", marginBottom: 8 }}>{q}</div>
                  <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>{a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
