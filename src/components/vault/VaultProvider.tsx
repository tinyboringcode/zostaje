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

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  const refresh = React.useCallback(() => {
    setUnlocked(keystore.isUnlocked());
  }, []);

  const lock = React.useCallback(() => {
    keystore.lock();
    setUnlocked(false);
  }, []);

  // Initial load: check if vault exists on this device.
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Bootstrap bundled plugins + seed starter rules once the vault is open.
  // Kick off the initial Pro sync pull as well (best-effort).
  React.useEffect(() => {
    if (!unlocked) return;
    bootstrapPlugins().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("bootstrapPlugins failed:", err);
    });
    (async () => {
      const plan = await fetchPlan();
      if (plan === "pro") autoSync();
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

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        …
      </div>
    );
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
