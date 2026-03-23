"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "cf-intro-seen";

export function IntroScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        animation: "fade-in 300ms ease both",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%" }}>
        {/* Brand */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-3)",
            margin: "0 0 48px",
            letterSpacing: "-0.01em",
          }}
        >
          zostaje.
        </p>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(24px, 5vw, 36px)",
            fontWeight: 400,
            color: "var(--text-1)",
            lineHeight: 1.25,
            margin: "0 0 24px",
            letterSpacing: "-0.02em",
          }}
        >
          Wiem jak trudno jest
          <br />
          ogarniać finanse JDG.
        </h1>

        {/* Body text */}
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: "var(--text-2)",
            lineHeight: 1.7,
            margin: "0 0 40px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p style={{ margin: 0 }}>
            Duży ZUS, zaliczka na PIT, VAT, faktury — i nagle okazuje się, że na
            koncie prawie nic nie zostaje, choć zarobki wyglądały nieźle. To nie
            twoja wina. Finanse jednoosobowej działalności mają więcej ruchomych
            części niż się wydaje.
          </p>
          <p style={{ margin: 0 }}>
            Zanim zdecydujesz się wynająć specjalistę, możesz już dziś mieć
            porządek. To narzędzie zostało zaprojektowane razem z księgowymi i
            przedsiębiorcami — żeby wiedzieć dokładnie co zostaje po wszystkich
            zobowiązaniach, zanim skończysz miesiąc.
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--text-3)",
              borderLeft: "2px solid var(--border)",
              paddingLeft: 14,
            }}
          >
            Zwalidowane przez specjalistów. Wolne. Bez limitu.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={dismiss}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            padding: "12px 28px",
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

        {/* Skip */}
        <button
          onClick={dismiss}
          style={{
            display: "block",
            marginTop: 16,
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
          pomiń
        </button>
      </div>
    </div>
  );
}
