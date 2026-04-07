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

function DownloadCard({ platform, icon, version, note, href, primary }: {
  platform: string; icon: React.ReactNode; version: string; note: string; href: string; primary?: boolean;
}) {
  return (
    <a href={href}
      style={{
        display: "flex", flexDirection: "column", gap: 16, padding: "32px 28px",
        background: primary ? "#1a1a2e" : "#161616",
        border: `1px solid ${primary ? "#7c3aed" : "#2a2a2a"}`,
        borderRadius: 10, textDecoration: "none", transition: "border-color 150ms, background 150ms", cursor: "pointer",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primary ? "#9d5aff" : "#444"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primary ? "#7c3aed" : "#2a2a2a"; }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{platform}</div>
        <div style={{ fontSize: 12, color: "#555", fontFamily: "var(--font-mono)" }}>v{version}</div>
      </div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{note}</div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginTop: "auto",
        padding: "10px 20px", borderRadius: 6, fontSize: 14, fontWeight: 600,
        background: primary ? "#7c3aed" : "#1f1f1f",
        color: "#fff", alignSelf: "flex-start",
      }}>
        ↓ Pobierz
      </div>
    </a>
  );
}

export default function DownloadPage() {
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
      <section style={{ padding: "80px 0 60px", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW }}>
          {/* Logo */}
          <div style={{ marginBottom: 40, display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 40px rgba(124, 58, 237, 0.4)",
              fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "#fff",
            }}>
              z.
            </div>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, textAlign: "center", margin: "0 0 16px" }}>
            Pobierz zostaje
          </h1>
          <p style={{ fontSize: 18, color: "#888", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
            Aplikacja finansowa dla polskich JDG. Działa lokalnie — Twoje dane nigdy nie opuszczają urządzenia.
          </p>
        </div>
      </section>

      {/* Download cards */}
      <section style={{ padding: "64px 0" }}>
        <div style={{ ...maxW }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 48 }}>
            <DownloadCard
              platform="macOS"
              icon="🍎"
              version="1.0.0"
              note="macOS 12 Monterey lub nowszy. Apple Silicon i Intel."
              href="#"
              primary
            />
            <DownloadCard
              platform="Windows"
              icon="🪟"
              version="1.0.0"
              note="Windows 10 lub nowszy. x64."
              href="#"
            />
            <DownloadCard
              platform="Linux"
              icon="🐧"
              version="1.0.0"
              note="AppImage, deb, rpm. x64 / ARM64."
              href="#"
            />
            <DownloadCard
              platform="Web App"
              icon="🌐"
              version="online"
              note="Bez instalacji. Działa w przeglądarce jako PWA."
              href="/dashboard"
            />
          </div>

          {/* Version info */}
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Aktualna wersja</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "#fff" }}>zostaje v1.0.0</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Data wydania</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#888" }}>kwiecień 2026</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Licencja</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#888" }}>Open Source (MIT)</div>
              </div>
              <a href="https://github.com/tinyboringcode/zostaje/releases" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#7c3aed", textDecoration: "none" }}>
                Wszystkie wersje →
              </a>
            </div>
          </div>

          {/* Features list */}
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 24 }}>co zawiera</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {[
                { icon: "🔒", title: "Local-first", desc: "Dane w zaszyfrowanym skarbcu IndexedDB na Twoim urządzeniu." },
                { icon: "📊", title: "Dashboard finansowy", desc: "KPI, wykresy, raporty miesięczne i roczne." },
                { icon: "🤖", title: "Auto-kategorie", desc: "AI kategoryzuje transakcje automatycznie." },
                { icon: "📄", title: "Faktury PDF", desc: "Generuj faktury i eksportuj do PDF." },
                { icon: "🔄", title: "Sync (Pro)", desc: "E2E szyfrowany sync między urządzeniami." },
                { icon: "📥", title: "Import CSV", desc: "Import wyciągów z popularnych banków." },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "18px 20px", display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
