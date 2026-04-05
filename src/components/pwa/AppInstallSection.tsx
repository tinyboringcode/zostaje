"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Browser = "chrome" | "edge" | "safari" | "firefox" | "other";

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("firefox/")) return "firefox";
  return "other";
}

const INSTRUCTIONS: Record<Browser, { title: string; steps: string[] }> = {
  chrome: {
    title: "Google Chrome",
    steps: [
      'Kliknij ikonę instalacji po prawej stronie paska adresu (⊕).',
      'Lub: menu ⋮ → "Zainstaluj zostaje.".',
      "Aplikacja otworzy się we własnym oknie.",
    ],
  },
  edge: {
    title: "Microsoft Edge",
    steps: [
      "Kliknij ikonę instalacji po prawej stronie paska adresu.",
      'Lub: menu ⋯ → "Aplikacje" → "Zainstaluj tę witrynę jako aplikację".',
    ],
  },
  safari: {
    title: "Safari (macOS)",
    steps: [
      'W pasku menu: Plik → "Dodaj do Docka…".',
      "Na iOS: przycisk Udostępnij → Dodaj do ekranu początkowego.",
    ],
  },
  firefox: {
    title: "Firefox",
    steps: [
      "Firefox na desktopie nie obsługuje instalacji PWA.",
      "Użyj Chrome, Edge lub Safari żeby zainstalować zostaje. jako aplikację.",
    ],
  },
  other: {
    title: "Twoja przeglądarka",
    steps: [
      'Poszukaj opcji „Zainstaluj aplikację" w menu przeglądarki.',
      "Jeśli jej nie widzisz — spróbuj Chrome, Edge lub Safari.",
    ],
  },
};

export function AppInstallSection() {
  const [browser, setBrowser] = React.useState<Browser>("other");
  const [installed, setInstalled] = React.useState(false);
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    setBrowser(detectBrowser());
    if (typeof window !== "undefined") {
      setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
      setInstalled(true);
    }
  }

  const info = INSTRUCTIONS[browser];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aplikacja</CardTitle>
        <CardDescription>
          Zainstaluj zostaje. jako natywną aplikację — własne okno, skróty, szybszy start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {installed ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Aplikacja jest już zainstalowana na tym urządzeniu.
          </p>
        ) : deferred ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">Twoja przeglądarka obsługuje instalację jednym kliknięciem.</p>
            <Button size="sm" onClick={install}>
              Zainstaluj
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">{info.title}</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              {info.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
