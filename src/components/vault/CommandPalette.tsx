"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { toast } from "sonner";
import { useVault } from "./VaultProvider";
import { exportPlainJSON } from "@/lib/vault-export";
import { cn } from "@/lib/utils";
import {
  Plus, Minus, Building2, FileText, Upload, Download, Lock,
  LayoutDashboard, ArrowLeftRight, BarChart3, Calculator,
  Receipt, PieChart, Settings, Network, FolderKanban, Zap,
  History, TrendingUp, Activity, Sparkles, BookOpen,
  Sun, Shield, Bell, Monitor,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  description?: string;
  icon?: React.ElementType;
  shortcut?: string;
  run: () => void | Promise<void>;
}

// ── Recent commands ──────────────────────────────────────────────────────

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem("zostaje.cmd.recent") ?? "[]"); } catch { return []; }
}

function pushRecent(id: string) {
  try {
    const arr = getRecent().filter((x) => x !== id);
    arr.unshift(id);
    localStorage.setItem("zostaje.cmd.recent", JSON.stringify(arr.slice(0, 5)));
  } catch { /* ignore */ }
}

// ── Theme toggle ─────────────────────────────────────────────────────────

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains("dark");
  if (isDark) {
    html.classList.remove("dark");
    localStorage.setItem("theme", "light");
  } else {
    html.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }
}

// ── Component ────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const { lock, unlocked } = useVault();
  const [open, setOpen] = React.useState(false);
  const [recentIds] = React.useState(getRecent);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !isMod) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        const editable = t && (t as HTMLElement).isContentEditable;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = React.useCallback(
    (href: string) => { setOpen(false); router.push(href); },
    [router],
  );

  const runCmd = React.useCallback(
    (cmd: CommandItem) => {
      pushRecent(cmd.id);
      cmd.run();
    },
    [],
  );

  const openSettings = React.useCallback(
    (category?: string) => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("zostaje:open-settings", { detail: { category } }));
    },
    [],
  );

  const commands: CommandItem[] = React.useMemo(
    () => [
      // ── Akcje ──────────────────────────────────────────────
      { id: "add-income", label: "Dodaj przychod", description: "Nowa transakcja przychodowa", group: "Akcje", icon: Plus, shortcut: "⌘⇧I", keywords: "nowa transakcja income", run: () => go("/transactions?new=1&type=income") },
      { id: "add-expense", label: "Dodaj wydatek", description: "Nowa transakcja kosztowa", group: "Akcje", icon: Minus, shortcut: "⌘⇧E", keywords: "nowa transakcja expense koszt", run: () => go("/transactions?new=1&type=expense") },
      { id: "add-kontrahent", label: "Dodaj kontrahenta", description: "Nowy klient lub firma", group: "Akcje", icon: Building2, keywords: "nowy klient firma", run: () => go("/contractors?new=1") },
      { id: "add-invoice", label: "Wystaw fakture", description: "Nowa faktura VAT", group: "Akcje", icon: FileText, keywords: "nowa faktura vat", run: () => go("/faktury?new=1") },
      { id: "import-csv", label: "Importuj CSV", description: "Import transakcji z pliku", group: "Akcje", icon: Upload, keywords: "import bank plik", run: () => go("/import") },
      { id: "export", label: "Eksportuj dane", description: "Pobierz backup JSON", group: "Akcje", icon: Download, keywords: "export backup json", run: async () => { setOpen(false); try { await exportPlainJSON(); toast.success("Wyeksportowano dane"); } catch (e) { toast.error((e as Error).message || "Eksport nie powiodl sie"); } } },
      { id: "generate-pdf", label: "Generuj raport PDF", description: "Raport finansowy do pobrania", group: "Akcje", icon: FileText, keywords: "pdf raport drukuj", run: () => go("/reports?pdf=1") },
      { id: "toggle-theme", label: "Zmien motyw", description: "Przelacz jasny / ciemny", group: "Akcje", icon: Sun, keywords: "dark light ciemny jasny motyw", run: () => { setOpen(false); toggleTheme(); } },
      { id: "lock", label: "Zablokuj skarbiec", description: "Zamknij i zaszyfruj dane", group: "Akcje", icon: Lock, keywords: "lock zamknij", run: () => { setOpen(false); lock(); } },

      // ── Nawigacja ──────────────────────────────────────────
      { id: "nav-overview", label: "Przeglad", group: "Nawigacja", icon: LayoutDashboard, keywords: "dashboard home glowna zostaje", run: () => go("/dashboard") },
      { id: "nav-transactions", label: "Transakcje", group: "Nawigacja", icon: ArrowLeftRight, keywords: "lista transakcji", run: () => go("/transactions") },
      { id: "nav-kontrahenci", label: "Kontrahenci", group: "Nawigacja", icon: Building2, keywords: "klienci firmy", run: () => go("/contractors") },
      { id: "nav-reports", label: "Raporty", group: "Nawigacja", icon: BarChart3, keywords: "raport miesieczny analiza", run: () => go("/reports") },
      { id: "nav-taxes", label: "Podatki i ZUS", description: "Kalkulator podatkow, symulacja", group: "Nawigacja", icon: Calculator, keywords: "pit ryczalt skladki zdrowotna kalkulator", run: () => go("/podatki") },
      { id: "nav-invoices", label: "Faktury", group: "Nawigacja", icon: FileText, keywords: "faktura vat ksef", run: () => go("/faktury") },
      { id: "nav-budgets", label: "Budzety", group: "Nawigacja", icon: PieChart, keywords: "budget limit", run: () => go("/budgets") },
      { id: "nav-categories", label: "Kategorie", group: "Nawigacja", icon: Receipt, keywords: "tag etykieta", run: () => go("/categories") },

      // ── Odkrywaj ──────────────────────────────────────────
      { id: "nav-graph", label: "Graf powiazan", description: "Wizualizacja sieci transakcji", group: "Odkrywaj", icon: Network, keywords: "wizualizacja d3 network mapa", run: () => go("/graph") },
      { id: "nav-rules", label: "Reguly automatyzacji", description: "Auto-kategoryzacja transakcji", group: "Odkrywaj", icon: Zap, keywords: "automat kategoryzacja silnik", run: () => go("/rules") },
      { id: "nav-projects", label: "Projekty", description: "Grupowanie transakcji w projekty", group: "Odkrywaj", icon: FolderKanban, keywords: "projekt grupowanie", run: () => go("/projects") },
      { id: "nav-audit", label: "Dziennik zmian", description: "Zaszyfrowany audit log", group: "Odkrywaj", icon: History, keywords: "audit log historia dziennik", run: () => go("/audit") },
      { id: "nav-indicators", label: "Wskazniki", description: "KPI i metryki biznesowe", group: "Odkrywaj", icon: TrendingUp, keywords: "kpi metryki analiza", run: () => go("/wskazniki") },
      { id: "nav-cycle", label: "Cykl finansowy", description: "Analiza wzorcow wydatkow", group: "Odkrywaj", icon: Activity, keywords: "cashflow cykl przeplyw", run: () => go("/cykl") },
      { id: "nav-ai", label: "Demo AI", description: "Lokalna AI do analizy", group: "Odkrywaj", icon: Sparkles, keywords: "ollama sztuczna inteligencja analiza", run: () => go("/ai-demo") },
      { id: "nav-knowledge", label: "Baza wiedzy", description: "Poradniki dla JDG", group: "Odkrywaj", icon: BookOpen, keywords: "wiedza poradnik jdg", run: () => go("/wiedza") },
      { id: "tax-compare", label: "Porownaj formy opodatkowania", description: "Symulacja: ryczalt vs liniowy vs skala", group: "Odkrywaj", icon: Calculator, keywords: "porownaj symulacja forma ryczalt liniowy skala", run: () => go("/podatki#symulacja") },

      // ── Ustawienia ─────────────────────────────────────────
      { id: "settings", label: "Ustawienia", group: "Ustawienia", icon: Settings, keywords: "settings config", run: () => openSettings() },
      { id: "settings-company", label: "Ustawienia > Profil firmy", group: "Ustawienia", icon: Building2, keywords: "nip adres firma", run: () => openSettings("company") },
      { id: "settings-tax", label: "Ustawienia > Podatki i ZUS", group: "Ustawienia", icon: Calculator, keywords: "zus vat ryczalt", run: () => openSettings("tax") },
      { id: "settings-invoices", label: "Ustawienia > Faktury", group: "Ustawienia", icon: FileText, keywords: "numeracja ksef", run: () => openSettings("invoices") },
      { id: "settings-ai", label: "Ustawienia > AI / Ollama", group: "Ustawienia", icon: Sparkles, keywords: "ollama model", run: () => openSettings("ai") },
      { id: "settings-notifications", label: "Ustawienia > Powiadomienia", group: "Ustawienia", icon: Bell, keywords: "smtp email alert", run: () => openSettings("notifications") },
      { id: "settings-vault", label: "Ustawienia > Skarbiec", group: "Ustawienia", icon: Shield, keywords: "haslo eksport import", run: () => openSettings("vault") },
      { id: "settings-plugins", label: "Ustawienia > Wtyczki", group: "Ustawienia", icon: Zap, keywords: "plugin wtyczka", run: () => openSettings("plugins") },
      { id: "settings-app", label: "Ustawienia > Aplikacja", group: "Ustawienia", icon: Monitor, keywords: "pwa instalacja motyw", run: () => openSettings("app") },
    ],
    [go, lock, openSettings],
  );

  // Build recent commands
  const recentCommands = React.useMemo(() => {
    return recentIds
      .map((id) => commands.find((c) => c.id === id))
      .filter(Boolean) as CommandItem[];
  }, [recentIds, commands]);

  if (!unlocked) return null;

  const groups = ["Ostatnie", ...Array.from(new Set(commands.map((c) => c.group)))];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[12vh] md:pt-[18vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className={cn(
              "w-full max-w-xl rounded-lg border border-input bg-background shadow-2xl overflow-hidden",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Paleta komend" shouldFilter>
              <div className="flex items-center border-b border-input px-4">
                <Command.Input
                  autoFocus
                  placeholder="Wpisz komende lub szukaj..."
                  className="flex h-12 w-full bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="ml-2 shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-input bg-muted text-muted-foreground font-mono">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  Brak pasujacych komend.
                </Command.Empty>

                {/* Recent */}
                {recentCommands.length > 0 && (
                  <Command.Group
                    heading="Ostatnie"
                    className={groupClass}
                  >
                    {recentCommands.map((c) => (
                      <CommandRow key={`recent-${c.id}`} cmd={c} onRun={() => { runCmd(c); }} />
                    ))}
                  </Command.Group>
                )}

                {/* All groups */}
                {groups.filter((g) => g !== "Ostatnie").map((group) => (
                  <Command.Group key={group} heading={group} className={groupClass}>
                    {commands
                      .filter((c) => c.group === group)
                      .map((c) => (
                        <CommandRow key={c.id} cmd={c} onRun={() => { runCmd(c); }} />
                      ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}

// ── Command row ──────────────────────────────────────────────────────────

function CommandRow({ cmd, onRun }: { cmd: CommandItem; onRun: () => void }) {
  const Icon = cmd.icon;
  return (
    <Command.Item
      value={`${cmd.label} ${cmd.keywords ?? ""}`}
      onSelect={onRun}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
      style={{ minHeight: 40 }}
    >
      {Icon && (
        <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={14} style={{ opacity: 0.7 }} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13 }}>{cmd.label}</span>
        {cmd.description && (
          <span style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
            {cmd.description}
          </span>
        )}
      </div>
      {cmd.shortcut && (
        <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
          {cmd.shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

const groupClass = "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground";
