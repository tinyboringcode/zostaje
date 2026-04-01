"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "onboarding_done";
const SETTINGS_KEY = "user_settings";

type ZusTyp = "preferencyjny" | "pelny";
type TaxForm = "skala" | "liniowy" | "ryczalt";
type RyczaltRate = "8.5" | "12" | "15" | "inna";

interface UserSettings {
  zusTyp: ZusTyp;
  taxForm: TaxForm;
  ryczaltRate?: RyczaltRate;
}

function ChoiceBtn({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        borderRadius: 6,
        border: selected ? "2px solid var(--text-1)" : "2px solid var(--border)",
        background: selected ? "var(--text-1)" : "transparent",
        color: selected ? "var(--bg)" : "var(--text-2)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        cursor: "pointer",
        transition: "all 100ms",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function IntroScreen() {
  const [phase, setPhase] = useState<"intro" | "step1" | "step2" | "step3" | "done">("intro");
  const [visible, setVisible] = useState(false);
  const [zusTyp, setZusTyp] = useState<ZusTyp | null>(null);
  const [taxForm, setTaxForm] = useState<TaxForm | null>(null);
  const [ryczaltRate, setRyczaltRate] = useState<RyczaltRate | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const finish = (settings: UserSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEY, "1");
    // keep legacy key so old check doesn't re-trigger
    localStorage.setItem("cf-intro-seen", "1");
    setPhase("done");
    setTimeout(() => setVisible(false), 300);
  };

  const handleStep2Next = () => {
    if (!taxForm) return;
    if (taxForm === "ryczalt") {
      setPhase("step3");
    } else {
      finish({ zusTyp: zusTyp!, taxForm });
    }
  };

  const handleStep3Next = () => {
    if (!ryczaltRate) return;
    finish({ zusTyp: zusTyp!, taxForm: "ryczalt", ryczaltRate });
  };

  if (!visible) return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    animation: phase === "done" ? "none" : "fade-in 300ms ease both",
    opacity: phase === "done" ? 0 : 1,
    transition: "opacity 300ms ease",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    maxWidth: 480,
    width: "100%",
    padding: "36px 32px",
  };

  // ── Intro phase ───────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-3)", margin: "0 0 32px" }}>
            zostaje.
          </p>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(22px, 5vw, 32px)",
              fontWeight: 400,
              color: "var(--text-1)",
              lineHeight: 1.25,
              margin: "0 0 20px",
              letterSpacing: "-0.02em",
            }}
          >
            Wiem jak trudno jest<br />ogarniać finanse JDG.
          </h1>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-2)",
              lineHeight: 1.7,
              margin: "0 0 32px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p style={{ margin: 0 }}>
              Duży ZUS, zaliczka na PIT, VAT, faktury — i nagle okazuje się, że na koncie prawie nic
              nie zostaje, choć zarobki wyglądały nieźle. To nie twoja wina.
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-3)",
                borderLeft: "2px solid var(--border)",
                paddingLeft: 12,
              }}
            >
              Zwalidowane przez specjalistów. Wolne. Bez limitu.
            </p>
          </div>
          <button
            onClick={() => setPhase("step1")}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              padding: "11px 28px",
              background: "var(--text-1)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            zacznij →
          </button>
          <button
            onClick={() => finish({ zusTyp: "pelny", taxForm: "skala" })}
            style={{
              display: "block",
              marginTop: 14,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              textDecorationColor: "var(--border)",
            }}
          >
            pomiń konfigurację
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: ZUS type ──────────────────────────────────────────────────────
  if (phase === "step1") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", margin: "0 0 24px" }}>
            Krok 1/3
          </p>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 20,
              fontWeight: 500,
              color: "var(--text-1)",
              margin: "0 0 24px",
              letterSpacing: "-0.01em",
            }}
          >
            Jak długo prowadzisz działalność?
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            <ChoiceBtn selected={zusTyp === "preferencyjny"} onClick={() => setZusTyp("preferencyjny")}>
              Krócej niż 2 lata
            </ChoiceBtn>
            <ChoiceBtn selected={zusTyp === "pelny"} onClick={() => setZusTyp("pelny")}>
              Powyżej 2 lat
            </ChoiceBtn>
          </div>
          <button
            onClick={() => zusTyp && setPhase("step2")}
            disabled={!zusTyp}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              padding: "11px 28px",
              background: zusTyp ? "var(--text-1)" : "var(--surface2)",
              color: zusTyp ? "var(--bg)" : "var(--text-3)",
              border: "none",
              borderRadius: 4,
              cursor: zusTyp ? "pointer" : "not-allowed",
              letterSpacing: "-0.01em",
            }}
          >
            dalej →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Tax form ──────────────────────────────────────────────────────
  if (phase === "step2") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", margin: "0 0 24px" }}>
            Krok 2/3
          </p>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 20,
              fontWeight: 500,
              color: "var(--text-1)",
              margin: "0 0 24px",
              letterSpacing: "-0.01em",
            }}
          >
            Jaka forma opodatkowania?
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            <ChoiceBtn selected={taxForm === "skala"} onClick={() => setTaxForm("skala")}>
              Skala 12/32%
            </ChoiceBtn>
            <ChoiceBtn selected={taxForm === "liniowy"} onClick={() => setTaxForm("liniowy")}>
              Liniowy 19%
            </ChoiceBtn>
            <ChoiceBtn selected={taxForm === "ryczalt"} onClick={() => setTaxForm("ryczalt")}>
              Ryczałt
            </ChoiceBtn>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setPhase("step1")}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                padding: "10px 20px",
                background: "none",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              ← wróć
            </button>
            <button
              onClick={handleStep2Next}
              disabled={!taxForm}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                padding: "11px 28px",
                background: taxForm ? "var(--text-1)" : "var(--surface2)",
                color: taxForm ? "var(--bg)" : "var(--text-3)",
                border: "none",
                borderRadius: 4,
                cursor: taxForm ? "pointer" : "not-allowed",
                letterSpacing: "-0.01em",
              }}
            >
              dalej →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Ryczałt rate (only if ryczałt selected) ───────────────────────
  if (phase === "step3") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", margin: "0 0 24px" }}>
            Krok 3/3
          </p>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 20,
              fontWeight: 500,
              color: "var(--text-1)",
              margin: "0 0 24px",
              letterSpacing: "-0.01em",
            }}
          >
            Stawka ryczałtu?
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            {(["8.5", "12", "15", "inna"] as RyczaltRate[]).map((r) => (
              <ChoiceBtn key={r} selected={ryczaltRate === r} onClick={() => setRyczaltRate(r)}>
                {r === "inna" ? "inna" : `${r}%`}
              </ChoiceBtn>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setPhase("step2")}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                padding: "10px 20px",
                background: "none",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              ← wróć
            </button>
            <button
              onClick={handleStep3Next}
              disabled={!ryczaltRate}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                padding: "11px 28px",
                background: ryczaltRate ? "var(--text-1)" : "var(--surface2)",
                color: ryczaltRate ? "var(--bg)" : "var(--text-3)",
                border: "none",
                borderRadius: 4,
                cursor: ryczaltRate ? "pointer" : "not-allowed",
                letterSpacing: "-0.01em",
              }}
            >
              gotowe →
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 20, fontFamily: "var(--font-sans)" }}>
            Możesz to zmienić w Ustawienia
          </p>
        </div>
      </div>
    );
  }

  return null;
}
