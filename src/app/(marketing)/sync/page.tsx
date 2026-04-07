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

export default function SyncPage() {
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
        <div style={{ ...maxW }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#9d7dff", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />
            Tylko dla planu Pro
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 20px", maxWidth: 640 }}>
            Sync — Twoje dane.<br />Na każdym urządzeniu.
          </h1>
          <p style={{ fontSize: 18, color: "#888", maxWidth: 520, lineHeight: 1.6, margin: "0 0 36px" }}>
            Szyfrowanie end-to-end. Serwer nie widzi Twoich danych. Synchronizacja automatyczna po każdej zmianie.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/pricing" style={{ background: "#7c3aed", color: "#fff", padding: "12px 24px", borderRadius: 7, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Aktywuj Pro
            </Link>
            <a href="#jak-dziala" style={{ color: "#888", fontSize: 14, textDecoration: "none", padding: "12px 0", transition: "color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#888")}>
              Jak to działa →
            </a>
          </div>
        </div>
      </section>

      {/* Diagram */}
      <section id="jak-dziala" style={{ padding: "64px 0", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 40 }}>jak działa sync</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {[
              { icon: "💻", label: "Urządzenie A", sub: "macOS / Windows / Web" },
              { arrow: true },
              { icon: "🔒", label: "Szyfrowanie E2E", sub: "AES-GCM 256 — klucz tylko u Ciebie" },
              { arrow: true },
              { icon: "☁️", label: "Serwer", sub: "widzi tylko zaszyfrowany blob" },
              { arrow: true },
              { icon: "🔒", label: "Deszyfrowanie", sub: "lokalnie na urządzeniu B" },
              { arrow: true },
              { icon: "📱", label: "Urządzenie B", sub: "Linux / Android / iOS" },
            ].map((step, i) => {
              if ("arrow" in step) {
                return <div key={i} style={{ fontFamily: "var(--font-mono)", color: "#2a2a2a", fontSize: 20 }}>→</div>;
              }
              return (
                <div key={i} style={{ flex: 1, minWidth: 120, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{step.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: "#555", lineHeight: 1.4 }}>{step.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "64px 0", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "🔐", title: "End-to-End szyfrowanie", desc: "Cały snapshot danych szyfrowany kluczem sesji zanim opuści urządzenie. Serwer przechowuje tylko zaszyfrowany blob." },
              { icon: "⚡", title: "Auto-sync", desc: "Debounced push po każdej mutacji. Zmiany docierają na drugie urządzenie w ciągu sekund." },
              { icon: "🔄", title: "Last-write-wins", desc: "Konflikty rozwiązywane po polu updatedAt. Prosta, przewidywalna logika mergowania." },
              { icon: "🌐", title: "Wiele urządzeń", desc: "macOS, Windows, Linux, Web, Android, iOS — wszystko przez jeden token Pro." },
              { icon: "📴", title: "Offline-first", desc: "Aplikacja działa bez internetu. Sync odbywa się w tle gdy połączenie wróci." },
              { icon: "🛡️", title: "Zero-knowledge", desc: "Twoje hasło i klucz szyfrowania nigdy nie trafiają na serwer. Nawet my nie możemy odczytać Twoich danych." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "24px 22px" }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup */}
      <section style={{ padding: "64px 0" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 40 }}>jak uruchomić sync</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 560 }}>
            {[
              { n: "01", title: "Aktywuj Pro", desc: "Kup subskrypcję Pro — pierwsze 14 dni gratis." },
              { n: "02", title: "Skonfiguruj SYNC_TOKEN", desc: "W Ustawieniach → Sync wpisz swój token. Token autoryzuje dostęp do endpointu /api/sync." },
              { n: "03", title: "Zaloguj się na drugim urządzeniu", desc: "Otwórz aplikację, odblokuj skarbiec tym samym hasłem." },
              { n: "04", title: "Gotowe", desc: "Sync działa automatycznie. Ikona w sidebarze pokazuje status w czasie rzeczywistym." },
            ].map(({ n, title, desc }, i, arr) => (
              <div key={n} style={{ display: "flex", gap: 20, paddingBottom: i < arr.length - 1 ? 28 : 0, borderBottom: i < arr.length - 1 ? "1px solid #1f1f1f" : "none", paddingTop: i > 0 ? 28 : 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#444", letterSpacing: "0.04em", flexShrink: 0, paddingTop: 2 }}>{n}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48 }}>
            <Link href="/pricing" style={{ background: "#7c3aed", color: "#fff", padding: "13px 28px", borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
              Aktywuj Sync z Pro →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
