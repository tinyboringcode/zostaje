"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * beforeinstallprompt lives outside lib.dom types. We narrow it here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "zostaje.install.dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setDeferred(null);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl bg-background border border-border shadow-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Zainstaluj zostaje.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Uruchamiaj jak natywną aplikację — własne okno, skróty, szybszy dostęp.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={dismiss}>
          Nie teraz
        </Button>
        <Button size="sm" onClick={install}>
          Zainstaluj
        </Button>
      </div>
    </div>
  );
}
