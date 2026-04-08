"use client";

import * as React from "react";
import { keystore, isVaultInitialized } from "@/lib/keystore";
import { bootstrapPlugins } from "@/plugins";
import { autoSync } from "@/lib/sync";
import { fetchPlan } from "@/lib/pro";
import { LockScreen } from "./LockScreen";

interface VaultContextValue {
  unlocked: boolean;
  initialized: boolean;
  lock: () => void;
  refresh: () => void;
}

const VaultContext = React.createContext<VaultContextValue | null>(null);

const AUTO_LOCK_MS = 30 * 60 * 1000; // 30 minutes of inactivity

export function useVault(): VaultContextValue {
  const ctx = React.useContext(VaultContext);
  if (!ctx) throw new Error("useVault musi być wewnątrz <VaultProvider>");
  return ctx;
}

/** Check if running inside the Electron shell. */
function isDesktop(): boolean {
  return typeof window !== "undefined" && window.zostaje?.isDesktop === true;
}

/** Shown to web (non-desktop) users who have a free plan. */
function WebUpgradeGate() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0a0a0a)",
        color: "var(--text-1, #fff)",
        fontFamily: "var(--font-sans, sans-serif)",
        padding: "0 24px",
        gap: 0,
      }}
    >
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 32 }}>
          zostaje.
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, lineHeight: 1.3 }}>
          Wymagana subskrypcja Pro
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-3, #888)", lineHeight: 1.7, marginBottom: 28 }}>
          Wersja przeglądarkowa wymaga aktywnego planu Pro. Twoje dane są przechowywane
          na naszych serwerach w formacie zaszyfrowanym end-to-end (klucz tylko u Ciebie).
        </p>

        <div
          style={{
            border: "1px solid var(--border, #2a2a2a)",
            borderRadius: 10,
            padding: "20px",
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          {[
            "Dostęp z przeglądarki na każdym urządzeniu",
            "Synchronizacja E2E — klucz tylko u Ciebie",
            "Backup na serwerze",
            "Priorytetowe wsparcie",
          ].map((f) => (
            <div key={f} style={{ fontSize: 13, color: "var(--text-2, #ccc)", display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
              <span style={{ color: "#16a34a", fontSize: 14, flexShrink: 0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            window.location.href = "/account";
          }}
          style={{
            width: "100%",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            padding: "13px 0",
            borderRadius: 7,
            border: "none",
            background: "var(--text-1, #fff)",
            color: "var(--bg, #0a0a0a)",
            cursor: "pointer",
            letterSpacing: "-0.01em",
            marginBottom: 12,
          }}
        >
          Przejdź na Pro — 29 zł/mies →
        </button>

        <p style={{ fontSize: 12, color: "var(--text-3, #666)" }}>
          Wolisz dane lokalnie?{" "}
          <a href="/" style={{ color: "var(--text-2, #aaa)", textDecoration: "underline" }}>
            Pobierz wersję desktopową
          </a>{" "}
          — darmową na zawsze.
        </p>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border, #2a2a2a)" }}>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
              window.location.href = "/auth";
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "var(--text-3, #666)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Wyloguj się
          </button>
        </div>
      </div>
    </div>
  );
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const [plan, setPlan] = React.useState<"free" | "pro" | null>(null);
  const [planLoading, setPlanLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    setUnlocked(keystore.isUnlocked());
  }, []);

  const lock = React.useCallback(() => {
    keystore.lock();
    setUnlocked(false);
  }, []);

  // Initial load: check vault state + fetch plan for web users.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ok = await isVaultInitialized();
        if (!cancelled) {
          setInitialized(ok);
          setUnlocked(keystore.isUnlocked());
          setMounted(true);
        }
      } catch {
        if (!cancelled) {
          setInitialized(false);
          setMounted(true);
        }
      }
    })();

    // Fetch plan (web: from /api/auth/me; desktop: from PLAN env via same endpoint).
    fetchPlan()
      .then((p) => {
        if (!cancelled) setPlan(p as "free" | "pro");
      })
      .catch(() => {
        if (!cancelled) setPlan("free");
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Bootstrap bundled plugins + seed starter rules once the vault is open.
  React.useEffect(() => {
    if (!unlocked) return;
    bootstrapPlugins().catch((err) => {
      console.error("bootstrapPlugins failed:", err);
    });
    (async () => {
      const p = await fetchPlan();
      if (p === "pro") autoSync();
    })();
  }, [unlocked]);

  // Auto-lock after inactivity.
  React.useEffect(() => {
    if (!unlocked) return;
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        keystore.lock();
        setUnlocked(false);
      }, AUTO_LOCK_MS);
    };

    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "touchstart"];
    reset();
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked]);

  const value = React.useMemo<VaultContextValue>(
    () => ({ unlocked, initialized, lock, refresh }),
    [unlocked, initialized, lock, refresh]
  );

  // SSR / hydration guard
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        …
      </div>
    );
  }

  // Web browser: if plan is still loading, show spinner
  if (!isDesktop() && planLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        …
      </div>
    );
  }

  // Web browser with free plan → show upgrade gate
  if (!isDesktop() && plan !== "pro") {
    return <WebUpgradeGate />;
  }

  return (
    <VaultContext.Provider value={value}>
      {unlocked ? (
        children
      ) : (
        <LockScreen
          mode={initialized ? "unlock" : "setup"}
          onUnlocked={() => {
            setInitialized(true);
            setUnlocked(true);
          }}
        />
      )}
    </VaultContext.Provider>
  );
}
