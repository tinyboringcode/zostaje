"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Config ──────────────────────────────────────────────────────────────────
const GITHUB_REPO = "tinyboringcode/zostaje";

// ── Calculator constants (2026) ─────────────────────────────────────────────
const ZUS_FIXED = 1879;
const KOSZTY_FLAT = 500;

// ── Shared styles ───────────────────────────────────────────────────────────
const maxW: React.CSSProperties = { maxWidth: 880, margin: "0 auto", padding: "0 32px" };
const sectionPad: React.CSSProperties = { padding: "96px 0" };

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtInt(n: number) {
  return Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDec(n: number) {
  return Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Pixel heart ─────────────────────────────────────────────────────────────
function PixelHeart({ color = "#D44C47", size = 20 }: { color?: string; size?: number }) {
  const s = size / 11;
  return (
    <svg width={11 * s} height={10 * s} viewBox="0 0 11 10"
      style={{ display: "inline-block", imageRendering: "pixelated", verticalAlign: "middle" }} aria-hidden="true">
      <rect x="1" y="0" width="3" height="1" fill={color} />
      <rect x="7" y="0" width="3" height="1" fill={color} />
      <rect x="0" y="1" width="5" height="2" fill={color} />
      <rect x="6" y="1" width="5" height="2" fill={color} />
      <rect x="0" y="3" width="11" height="2" fill={color} />
      <rect x="1" y="5" width="9" height="1" fill={color} />
      <rect x="2" y="6" width="7" height="1" fill={color} />
      <rect x="3" y="7" width="5" height="1" fill={color} />
      <rect x="4" y="8" width="3" height="1" fill={color} />
      <rect x="5" y="9" width="1" height="1" fill={color} />
    </svg>
  );
}

// ── Footer link ─────────────────────────────────────────────────────────────
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      style={{ fontSize: 14, fontFamily: "var(--font-sans)", color: "#666", textDecoration: "none", display: "block", transition: "color 150ms" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#666")}>
      {children}
    </a>
  );
}

function ColLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontFamily: "var(--font-sans)", color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>
      {label}
    </div>
  );
}

// ── App mockup ──────────────────────────────────────────────────────────────
function AppMockup() {
  return (
    <div className="hidden sm:block" style={{ maxWidth: 520, margin: "60px auto 0", border: "1px solid #2a2a2a", borderRadius: 10, boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden" }}>
      {/* Browser chrome */}
      <div style={{ height: 34, background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 12px", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
        <div style={{ flex: 1, margin: "0 10px", height: 16, borderRadius: 4, background: "#252525", display: "flex", alignItems: "center", paddingLeft: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#555" }}>zostaje.app/dashboard</span>
        </div>
      </div>
      {/* Dashboard content */}
      <div style={{ display: "flex", background: "#111" }}>
        {/* Sidebar */}
        <div style={{ width: 48, background: "#0d0d0d", borderRight: "1px solid #1f1f1f", padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {["●", "≡", "↕", "⬡", "◈"].map((icon, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: i === 0 ? "#1a1a2e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: i === 0 ? "#7c3aed" : "#444" }}>
              {icon}
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: "20px 20px 24px" }}>
          <p style={{ fontSize: 9, color: "#555", fontFamily: "var(--font-sans)", textTransform: "capitalize", letterSpacing: "0.02em", marginBottom: 8 }}>
            kwiecień 2026
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: "#17c964", marginBottom: 4 }}>
            +5 224,00 zł
          </div>
          <p style={{ fontSize: 9, color: "#555", fontFamily: "var(--font-sans)", marginBottom: 14 }}>
            zostaje po podatkach i ZUS
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { val: "+8 000", label: "przychody", color: "#17c964" },
              { val: "−1 232", label: "wydatki", color: "#f31260" },
              { val: "−2 544", label: "ZUS+PIT", color: "#f5a524" },
            ].map(({ val, label, color }) => (
              <span key={label} style={{ fontSize: 9, fontFamily: "var(--font-sans)", color: "#555", background: "#1a1a1a", padding: "3px 7px", borderRadius: 4 }}>
                <span style={{ fontFamily: "var(--font-mono)", color }}>{val}</span> {label}
              </span>
            ))}
          </div>
          {/* Mini cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: "Przychody", val: "8 000 zł", color: "#17c964" },
              { label: "Wydatki", val: "1 232 zł", color: "#f31260" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 7, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color, letterSpacing: "-0.01em" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Nav link helper ─────────────────────────────────────────────────────────
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#999", textDecoration: "none", transition: "color 150ms", padding: "4px 0" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#999")}>
      {children}
    </Link>
  );
}

// ── Sticky bar ──────────────────────────────────────────────────────────────
function StickyBar({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 48,
      background: "rgba(13,13,13,0.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      borderBottom: "0.5px solid #1f1f1f", zIndex: 60,
      display: "flex", alignItems: "center", paddingInline: 24,
      transform: visible ? "translateY(0)" : "translateY(-100%)", transition: "transform 200ms ease",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em", color: "#fff", flexShrink: 0 }}>
        zostaje.
      </span>
      <span className="hidden sm:block" style={{ flex: 1, textAlign: "center", fontSize: 13, color: "#666", fontFamily: "var(--font-sans)" }}>
        29 zł/mies — pierwsze 14 dni za darmo
      </span>
      <div style={{ marginLeft: "auto" }}>
        <Link href="/dashboard" style={{ fontFamily: "var(--font-mono)", fontSize: 13, padding: "6px 14px", background: "#7c3aed", color: "#fff", borderRadius: 4, textDecoration: "none" }}>
          wypróbuj →
        </Link>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [income, setIncome] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // GitHub stars
  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then((r) => r.json())
      .then((d) => typeof d.stargazers_count === "number" && setStars(d.stargazers_count))
      .catch(() => {});
  }, []);

  // Sticky bar
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Calculator
  const podstawa = Math.max(0, income - ZUS_FIXED - KOSZTY_FLAT);
  const pit = income > 0 ? Math.round(0.19 * podstawa) : 0;
  const zostaje = income > 0 ? income - ZUS_FIXED - pit : 0;
  const zostajeColor = zostaje >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div style={{ background: "#0d0d0d", color: "#fff", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>

      <StickyBar visible={stickyVisible} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: "1px solid #1f1f1f", position: "sticky", top: 0, background: "#0d0d0d", zIndex: 50 }}>
        <div style={{ ...maxW, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link href="/" style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", textDecoration: "none" }}>
            zostaje.
          </Link>

          {/* Center nav links */}
          <div className="hidden sm:flex" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <NavLink href="/download">Download</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/sync">Sync</NavLink>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 12, color: "#666", textDecoration: "none", transition: "color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#666")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
              </svg>
              {stars !== null ? `★ ${stars.toLocaleString("pl-PL")}` : "GitHub"}
            </a>
            <Link href="/dashboard"
              style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#ccc", textDecoration: "none", padding: "6px 14px", border: "1px solid #333", borderRadius: 6, transition: "border-color 150ms, color 150ms" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#666"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#333"; (e.currentTarget as HTMLElement).style.color = "#ccc"; }}>
              Account
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div ref={heroRef}>
        <section style={{ padding: "120px 0 80px" }}>
          <div style={{ ...maxW }}>
            <h1 style={{
              fontSize: "clamp(48px, 7vw, 80px)", fontWeight: 700, color: "#ffffff",
              letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: "var(--font-sans)", margin: 0,
            }}>
              Nie zgaduj ile masz.<br />
              Zostaje pokazuje prawdę.
            </h1>
            <p style={{ fontSize: 20, color: "#888", maxWidth: 480, lineHeight: 1.6, marginTop: 20, marginBottom: 0, fontFamily: "var(--font-sans)" }}>
              Ile z Twoich przychodów naprawdę zostaje po ZUS i podatkach.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 36, flexWrap: "wrap" }}>
              <Link href="/download" style={{
                background: "#7c3aed", color: "#fff", padding: "13px 28px", borderRadius: 8,
                fontWeight: 600, fontSize: 15, textDecoration: "none", display: "inline-block", transition: "background 150ms",
              }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#6d28d9")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#7c3aed")}>
                Pobierz zostaje
              </Link>
              <a href="#kalkulator" style={{ color: "#888", fontSize: 15, textDecoration: "none", fontFamily: "var(--font-sans)", transition: "color 150ms" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#888")}>
                Wypróbuj kalkulator →
              </a>
            </div>
            <AppMockup />
          </div>
        </section>
      </div>

      {/* ── Kalkulator ──────────────────────────────────────────────────── */}
      <section id="kalkulator" style={{ ...sectionPad, background: "#111", borderTop: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 32 }}>
            kalkulator
          </p>
          <label style={{ fontSize: 15, color: "#888", display: "block", marginBottom: 16, fontFamily: "var(--font-sans)" }}>
            ile zarobiłeś w tym miesiącu?
          </label>
          <input
            type="number" min="0" value={income || ""}
            onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
            placeholder="np. 8000" autoFocus
            style={{
              fontFamily: "var(--font-mono)", fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 400,
              letterSpacing: "-0.03em", border: "none", borderBottom: "2px solid #2a2a2a", outline: "none",
              background: "transparent", color: "#fff", width: "100%", maxWidth: 400, padding: "8px 0", textAlign: "center",
            }}
          />
          <div style={{ marginTop: 40, minHeight: 96 }}>
            {income > 0 ? (
              <>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 8, fontFamily: "var(--font-sans)" }}>zostaje ci</p>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: zostajeColor }}>
                  ~{zostaje < 0 ? "−" : "+"}{fmtDec(zostaje)} zł
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "#666" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#f31260" }}>−{fmtInt(ZUS_FIXED)}</span> ZUS
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "#666" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#f5a524" }}>−{fmtInt(pit)}</span> podatek
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "#666" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#555" }}>−{fmtInt(KOSZTY_FLAT)}</span> wydatki
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "#2a2a2a" }}>
                +0,00 zł
              </div>
            )}
          </div>
          <div style={{ marginTop: 36 }}>
            <Link href="/dashboard" style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "#fff", textDecoration: "none", borderBottom: "1px solid #333", paddingBottom: 1 }}>
              śledź to co miesiąc →
            </Link>
            <p style={{ fontSize: 12, color: "#555", fontFamily: "var(--font-sans)", marginTop: 10 }}>
              dokładne wyliczenie po podaniu swoich kosztów i reżimu
            </p>
          </div>
        </div>
      </section>

      {/* ── Social proof ────────────────────────────────────────────────── */}
      <section style={{ ...sectionPad, borderTop: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(52px, 8vw, 88px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: "#fff" }}>340+</div>
              <p style={{ fontSize: 16, color: "#888", marginTop: 14, fontFamily: "var(--font-sans)" }}>JDG-owców wie ile zostaje</p>
            </div>
            <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "28px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1f1f1f", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "#666", flexShrink: 0 }}>MK</div>
                <div>
                  <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>Marek K.</div>
                  <div style={{ fontSize: 12, color: "#555" }}>hydraulik, JDG od 2019</div>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "#888", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>
                "Nareszcie wiem czy stać mnie na nowy sprzęt, zanim sprawdzę konto w banku."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ─────────────────────────────────────────────────────── */}
      <section style={{ ...sectionPad, borderTop: "1px solid #1f1f1f", background: "#111" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 400, color: "#fff", lineHeight: 1.3, marginBottom: 48, maxWidth: 640 }}>
            Masz kasę na koncie.<br />Ale ile naprawdę twoje?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {["ZUS którego nie zapłaciłeś", "podatek co kwartał", "faktura która przyjdzie"].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "#f31260", fontSize: 18, flexShrink: 0 }}>−</span>
                <span style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "#fff", fontWeight: 400 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="jak-to-dziala" style={{ ...sectionPad, borderTop: "1px solid #1f1f1f" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 40 }}>jak to działa</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", alignItems: "start" }}>
            {[
              { n: "01", text: "Wpisujesz co zarobiłeś" },
              { n: "02", text: "Podajesz swój reżim podatkowy" },
              { n: "03", text: "Widzisz ile zostaje" },
            ].map((step, i) => (
              <>
                <div key={step.n}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#444", letterSpacing: "0.04em", display: "block", marginBottom: 10 }}>{step.n}</span>
                  <span style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#fff", fontWeight: 400, lineHeight: 1.4 }}>{step.text}</span>
                </div>
                {i < 2 && (
                  <div key={`arr-${i}`} style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "#2a2a2a", padding: "2px 20px 0", alignSelf: "center" }}>→</div>
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ ...sectionPad, borderTop: "1px solid #1f1f1f", background: "#111" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 40, textAlign: "center" }}>cennik</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: "44px 48px", maxWidth: 400, width: "100%" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, letterSpacing: "-0.03em", color: "#fff" }}>29 zł</span>
                <span style={{ fontSize: 14, color: "#555" }}>/miesiąc</span>
              </div>
              <div style={{ fontSize: 13, color: "#17c964", fontWeight: 500 }}>pierwsze 14 dni za darmo — karta nie wymagana</div>
              <div style={{ height: 1, background: "#2a2a2a", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {["aktualne składki ZUS", "eksport PDF", "import CSV z banku", "raporty roczne", "wskaźniki finansowe", "działa na telefonie"].map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#17c964", fontSize: 13, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 15, color: "#888" }}>{feat}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/dashboard" style={{ display: "block", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, padding: "13px 0", background: "#7c3aed", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
                  wypróbuj za darmo
                </Link>
                <Link href="/pricing" style={{ display: "block", textAlign: "center", fontSize: 13, color: "#555", textDecoration: "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fff")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555")}>
                  Porównaj plany →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0a0a0a", borderTop: "1px solid #1f1f1f", overflow: "hidden" }}>
        <div style={{ ...maxW, padding: "60px 32px 48px", display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", marginBottom: 10 }}>zostaje.</div>
            <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
              © 2026 Boring Code. Wszelkie prawa zastrzeżone.<br />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                made with <PixelHeart size={11} /> by Boring Code
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 120px)", gap: 40 }}>
            <div>
              <ColLabel label="Produkt" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="/download">Download</FooterLink>
                <FooterLink href="/pricing">Pricing</FooterLink>
                <FooterLink href="/sync">Sync</FooterLink>
              </div>
            </div>
            <div>
              <ColLabel label="Social" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="#">Twitter / X</FooterLink>
                <FooterLink href={`https://github.com/${GITHUB_REPO}`}>GitHub</FooterLink>
              </div>
            </div>
            <div>
              <ColLabel label="Prawne" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="#">Polityka prywatności</FooterLink>
                <FooterLink href="#">Regulamin</FooterLink>
              </div>
            </div>
            <div>
              <ColLabel label="Konto" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="/dashboard">Account</FooterLink>
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(60px, 12vw, 160px)", fontWeight: 700, color: "#111", lineHeight: 0.78, userSelect: "none", letterSpacing: "-0.03em", textAlign: "center", pointerEvents: "none" }} aria-hidden="true">
          zostaje.
        </div>
      </footer>
    </div>
  );
}
