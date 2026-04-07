"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Config ─────────────────────────────────────────────────────────────────
const GITHUB_REPO = "tinyboringcode/zostaje";

// ── Calculator constants (2026) ────────────────────────────────────────────
const ZUS_FIXED = 1879;
const KOSZTY_FLAT = 500;

// ── Shared styles ──────────────────────────────────────────────────────────
const maxW: React.CSSProperties = { maxWidth: 880, margin: "0 auto", padding: "0 32px" };
const sectionPad: React.CSSProperties = { padding: "96px 0" };

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtInt(n: number) {
  return Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDec(n: number) {
  return Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Pixel heart ────────────────────────────────────────────────────────────
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

// ── Footer link ────────────────────────────────────────────────────────────
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      style={{ fontSize: 14, fontFamily: "var(--font-sans)", color: "var(--text-3)", textDecoration: "none", display: "block", transition: "color 150ms" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}>
      {children}
    </a>
  );
}

function ColLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontFamily: "var(--font-sans)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>
      {label}
    </div>
  );
}

// ── App mockup ─────────────────────────────────────────────────────────────
function AppMockup() {
  return (
    <div className="hidden sm:block" style={{ maxWidth: 320, margin: "40px auto 0", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow)", overflow: "hidden" }}>
      {/* Browser chrome */}
      <div style={{ height: 30, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 10px", gap: 5 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border)" }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border)" }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border)" }} />
        <div style={{ flex: 1, margin: "0 8px", height: 14, borderRadius: 3, background: "var(--surface2)", display: "flex", alignItems: "center", paddingLeft: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)" }}>zostaje.app</span>
        </div>
      </div>
      {/* Dashboard content */}
      <div style={{ padding: "18px 18px 22px", background: "var(--bg)" }}>
        <p style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "capitalize", letterSpacing: "0.02em", marginBottom: 10 }}>
          marzec 2026
        </p>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--green)" }}>
          +5 224,00 zł
        </div>
        <p style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-sans)", marginTop: 5, marginBottom: 10 }}>
          zostaje po podatkach i ZUS
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { val: "+8 000", label: "przychody", color: "var(--green)" },
            { val: "−1 232", label: "wydatki",   color: "var(--red)" },
            { val: "−2 544", label: "ZUS+PIT",   color: "var(--amber)" },
          ].map(({ val, label, color }) => (
            <span key={label} style={{ fontSize: 9, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
              <span style={{ fontFamily: "var(--font-mono)", color }}>{val}</span> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sticky bar ─────────────────────────────────────────────────────────────
function StickyBar({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      borderBottom: "0.5px solid var(--border)",
      zIndex: 60,
      display: "flex",
      alignItems: "center",
      paddingInline: 24,
      transform: visible ? "translateY(0)" : "translateY(-100%)",
      transition: "transform 200ms ease",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-1)", flexShrink: 0 }}>
        zostaje.
      </span>
      <span className="hidden sm:block" style={{ flex: 1, textAlign: "center", fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
        29 zł/mies — pierwsze 14 dni za darmo
      </span>
      <div style={{ marginLeft: "auto" }}>
        <Link href="/auth" style={{ fontFamily: "var(--font-mono)", fontSize: 13, padding: "6px 14px", background: "var(--text-1)", color: "var(--bg)", borderRadius: 4, textDecoration: "none", letterSpacing: "-0.01em" }}>
          wypróbuj →
        </Link>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [income, setIncome] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // GitHub stars
  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then((r) => r.json())
      .then((d) => typeof d.stargazers_count === "number" && setStars(d.stargazers_count))
      .catch(() => {});
  }, []);

  // Sticky bar via IntersectionObserver on hero
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Calculator
  const podstawa = Math.max(0, income - ZUS_FIXED - KOSZTY_FLAT);
  const pit = income > 0 ? Math.round(0.19 * podstawa) : 0;
  const zostaje = income > 0 ? income - ZUS_FIXED - pit : 0;
  const zostajeColor = zostaje >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div style={{ background: "var(--bg)", color: "var(--text-1)", fontFamily: "var(--font-sans)" }}>

      <StickyBar visible={stickyVisible} />

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 50 }}>
        <div style={{ ...maxW, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
            zostaje.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", textDecoration: "none", transition: "color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
              </svg>
              {stars !== null ? `★ ${stars.toLocaleString("pl-PL")}` : "GitHub"}
            </a>
            <Link href="/account" style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-2)", textDecoration: "none", marginRight: 8 }}>
              konto
            </Link>
            <Link href="/auth" style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-2)", textDecoration: "none" }}>
              zaloguj się →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 1. Hero — calculator ──────────────────────────────────────────── */}
      <section ref={heroRef} style={{ ...sectionPad, paddingTop: 100, paddingBottom: 100 }}>
        <div style={{ ...maxW, textAlign: "center" }}>

          {/* Input */}
          <label style={{ fontSize: 14, color: "var(--text-3)", display: "block", marginBottom: 16, fontFamily: "var(--font-sans)" }}>
            ile zarobiłeś w tym miesiącu?
          </label>
          <input
            type="number"
            min="0"
            value={income || ""}
            onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
            placeholder="np. 8000"
            autoFocus
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              border: "none",
              borderBottom: "2px solid var(--border)",
              outline: "none",
              background: "transparent",
              color: "var(--text-1)",
              width: "100%",
              maxWidth: 400,
              padding: "8px 0",
              textAlign: "center",
            }}
          />

          {/* Result */}
          <div style={{ marginTop: 40, minHeight: 96 }}>
            {income > 0 ? (
              <>
                <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 8, fontFamily: "var(--font-sans)" }}>
                  zostaje ci
                </p>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(40px, 7vw, 76px)",
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: zostajeColor,
                }}>
                  ~{zostaje < 0 ? "−" : "+"}{fmtDec(zostaje)} zł
                </div>
                {/* Breakdown */}
                <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--red)" }}>−{fmtInt(ZUS_FIXED)}</span> ZUS
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)" }}>−{fmtInt(pit)}</span> podatek
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>−{fmtInt(KOSZTY_FLAT)}</span> wydatki
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--border)" }}>
                +0,00 zł
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Link href="/auth" style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--text-1)", textDecoration: "none", borderBottom: "1px solid var(--border)", paddingBottom: 1, transition: "border-color 150ms" }}>
              śledź to co miesiąc →
            </Link>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
              dokładne wyliczenie po podaniu swoich kosztów i reżimu
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Social proof ───────────────────────────────────────────────── */}
      <section style={{ ...sectionPad, borderTop: "1px solid var(--border)" }}>
        <div style={{ ...maxW }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            {/* Counter */}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(52px, 8vw, 88px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--text-1)" }}>
                340+
              </div>
              <p style={{ fontSize: 16, color: "var(--text-2)", marginTop: 14, fontFamily: "var(--font-sans)" }}>
                JDG-owców wie ile zostaje
              </p>
            </div>
            {/* Testimonial */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "28px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)", flexShrink: 0 }}>
                  MK
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text-1)", fontWeight: 500, fontFamily: "var(--font-sans)" }}>Marek K.</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>hydraulik, JDG od 2019</div>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.65, fontStyle: "italic", fontFamily: "var(--font-sans)", margin: 0 }}>
                "Nareszcie wiem czy stać mnie na nowy sprzęt, zanim sprawdzę konto w banku."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Problem (unchanged) ────────────────────────────────────────── */}
      <section style={{ ...sectionPad, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 400, color: "var(--text-1)", lineHeight: 1.3, marginBottom: 48, maxWidth: 640 }}>
            Masz kasę na koncie.
            <br />
            Ale ile naprawdę twoje?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {["ZUS którego nie zapłaciłeś", "podatek co kwartał", "faktura która przyjdzie"].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--red)", fontSize: 18, flexShrink: 0 }}>−</span>
                <span style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "var(--text-1)", fontWeight: 400 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. How it works ───────────────────────────────────────────────── */}
      <section style={{ ...sectionPad, borderTop: "1px solid var(--border)" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 40 }}>
            jak to działa
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", alignItems: "start" }}>
            {[
              { n: "01", text: "Wpisujesz co zarobiłeś" },
              { n: "02", text: "Podajesz swój reżim podatkowy" },
              { n: "03", text: "Widzisz ile zostaje" },
            ].map((step, i) => (
              <>
                <div key={step.n}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.04em", display: "block", marginBottom: 10 }}>
                    {step.n}
                  </span>
                  <span style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-1)", fontWeight: 400, lineHeight: 1.4 }}>
                    {step.text}
                  </span>
                </div>
                {i < 2 && (
                  <div key={`arr-${i}`} style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--border)", padding: "2px 20px 0", alignSelf: "center" }}>
                    →
                  </div>
                )}
              </>
            ))}
          </div>
          <AppMockup />
        </div>
      </section>

      {/* ── 5. Pricing — single card ──────────────────────────────────────── */}
      <section id="pricing" style={{ ...sectionPad, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ ...maxW }}>
          <p style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 40, textAlign: "center" }}>
            cennik
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "44px 48px", maxWidth: 400, width: "100%", boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-sans)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Pro
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--text-1)" }}>
                  29 zł
                </span>
                <span style={{ fontSize: 14, color: "var(--text-3)" }}>/miesiąc</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--green)", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                pierwsze 14 dni za darmo — karta nie wymagana
              </div>
              <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {[
                  "aktualne składki ZUS aktualizowane co rok",
                  "eksport PDF",
                  "import CSV z banku",
                  "raporty roczne",
                  "wskaźniki finansowe",
                  "działa na telefonie",
                ].map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontSize: 13, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 15, color: "var(--text-2)", fontFamily: "var(--font-sans)" }}>{feat}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32 }}>
                <Link href="/auth" style={{ display: "block", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, padding: "13px 0", background: "var(--text-1)", color: "var(--bg)", borderRadius: 4, textDecoration: "none", letterSpacing: "-0.01em" }}>
                  wypróbuj za darmo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer (unchanged) ────────────────────────────────────────────── */}
      <footer style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ ...maxW, padding: "60px 32px 48px", display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-1)", marginBottom: 10 }}>
              zostaje.
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
              © 2026 Boring Code. Wszelkie prawa zastrzeżone.
              <br />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                made with <PixelHeart size={11} /> by Boring Code
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 120px)", gap: 40 }}>
            <div>
              <ColLabel label="Produkt" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="#">Funkcje</FooterLink>
                <FooterLink href="#pricing">Cennik</FooterLink>
                <FooterLink href="#">Blog</FooterLink>
              </div>
            </div>
            <div>
              <ColLabel label="Social" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="#">Twitter / X</FooterLink>
                <FooterLink href={`https://github.com/${GITHUB_REPO}`}>GitHub</FooterLink>
                <FooterLink href="#">Facebook</FooterLink>
              </div>
            </div>
            <div>
              <ColLabel label="Prawne" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="#">Polityka prywatności</FooterLink>
                <FooterLink href="#">Regulamin</FooterLink>
                <FooterLink href="#">Cookies</FooterLink>
              </div>
            </div>
            <div>
              <ColLabel label="Konto" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <FooterLink href="/auth">Zarejestruj się</FooterLink>
                <FooterLink href="/auth">Zaloguj</FooterLink>
                <FooterLink href="/account">Moje konto</FooterLink>
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(80px, 15vw, 180px)", fontWeight: 700, color: "#f0f0f0", lineHeight: 0.78, userSelect: "none", letterSpacing: "-0.03em", textAlign: "center", pointerEvents: "none" }} aria-hidden="true">
          zostaje.
        </div>
      </footer>
    </div>
  );
}
