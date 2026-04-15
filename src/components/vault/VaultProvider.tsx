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

/** Device-scoped key for web auto-unlock (stored in localStorage, not secret). */
const WEB_DEVICE_KEY = "zostaje.web.device-id";

function getOrCreateWebKey(): string {
  let key = localStorage.getItem(WEB_DEVICE_KEY);
  if (!key) {
    const a = crypto.randomUUID();
    const b = crypto.randomUUID();
    key = `${a}-${b}`;
    localStorage.setItem(WEB_DEVICE_KEY, key);
  }
  return key;
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  // Desktop-only: pro plan gate for auto-sync.
  const planRef = React.useRef<"free" | "pro" | null>(null);

  const refresh = React.useCallback(() => {
    setUnlocked(keystore.isUnlocked());
  }, []);

  const lock = React.useCallback(() => {
    keystore.lock();
    setUnlocked(false);
  }, []);

  // Initial load: check vault state + (desktop) fetch plan.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ok = await isVaultInitialized();
        if (cancelled) return;

        if (!isDesktop()) {
          // Web mode: auto-unlock with device key — no password prompt.
          const webKey = getOrCreateWebKey();
          try {
            if (ok) {
              await keystore.unlock(webKey);
            } else {
              await keystore.setup(webKey);
            }
          } catch {
            // Unlock failed (device key / salt mismatch). Reset vault state and re-setup.
            // Web vault data is local cache only — real data lives in the server DB.
            localStorage.removeItem("zostaje.vault.salt");
            localStorage.removeItem(WEB_DEVICE_KEY);
            const freshKey = getOrCreateWebKey();
            try { await keystore.setup(freshKey); } catch { /* already set up in another call */ }
          }
          if (!cancelled) {
            setInitialized(true);
            setUnlocked(true);
            setMounted(true);
          }
          return;
        }

        // Desktop: manual vault unlock.
        setInitialized(ok);
        setUnlocked(keystore.isUnlocked());
        setMounted(true);
      } catch {
        if (!cancelled) {
          setInitialized(false);
          setMounted(true);
        }
      }
    })();

    // Fetch plan for desktop (Pro sync).
    if (isDesktop()) {
      fetchPlan()
        .then((p) => { if (!cancelled) planRef.current = p as "free" | "pro"; })
        .catch(() => { if (!cancelled) planRef.current = "free"; });
    }

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
    if (isDesktop()) {
      (async () => {
        const p = planRef.current ?? await fetchPlan();
        if (p === "pro") autoSync();
      })();
    }
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

  // Web: vault is auto-unlocked — render immediately once mounted.
  if (!isDesktop()) {
    return (
      <VaultContext.Provider value={value}>
        {children}
      </VaultContext.Provider>
    );
  }

  // Desktop: manual vault unlock required.
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
