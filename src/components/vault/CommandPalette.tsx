"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { toast } from "sonner";
import { useVault } from "./VaultProvider";
import { exportPlainJSON } from "@/lib/vault-export";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void | Promise<void>;
}

export function CommandPalette() {
  const router = useRouter();
  const { lock, unlocked } = useVault();
  const [open, setOpen] = React.useState(false);

  // Cmd/Ctrl+K and "/" (when not typing) open the palette.
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
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const commands: CommandItem[] = React.useMemo(
    () => [
      // ── Akcje ──────────────────────────────────────────────
      {
        id: "add-income",
        label: "Dodaj przychód",
        group: "Akcje",
        keywords: "nowa transakcja income",
        run: () => go("/transactions?new=1&type=income"),
      },
      {
        id: "add-expense",
        label: "Dodaj wydatek",
        group: "Akcje",
        keywords: "nowa transakcja expense koszt",
        run: () => go("/transactions?new=1&type=expense"),
      },
      {
        id: "add-kontrahent",
        label: "Dodaj kontrahenta",
        group: "Akcje",
        keywords: "nowy klient firma",
        run: () => go("/contractors?new=1"),
      },
      {
        id: "add-invoice",
        label: "Wystaw fakturę",
        group: "Akcje",
        keywords: "nowa faktura vat",
        run: () => go("/faktury?new=1"),
      },
      {
        id: "import-csv",
        label: "Importuj CSV",
        group: "Akcje",
        keywords: "import bank plik",
        run: () => go("/import"),
      },
      {
        id: "export",
        label: "Eksportuj dane",
        group: "Akcje",
        keywords: "export backup json",
        run: async () => {
          setOpen(false);
          try {
            await exportPlainJSON();
            toast.success("Wyeksportowano dane");
          } catch (e) {
            toast.error((e as Error).message || "Eksport nie powiódł się");
          }
        },
      },
      {
        id: "lock",
        label: "Zablokuj skarbiec",
        group: "Akcje",
        keywords: "lock zamknij",
        run: () => {
          setOpen(false);
          lock();
        },
      },

      // ── Nawigacja ──────────────────────────────────────────
      {
        id: "nav-overview",
        label: "Przegląd",
        group: "Nawigacja",
        keywords: "dashboard home glowna zostaje",
        run: () => go("/dashboard"),
      },
      {
        id: "nav-transactions",
        label: "Transakcje",
        group: "Nawigacja",
        keywords: "lista transakcji",
        run: () => go("/transactions"),
      },
      {
        id: "nav-kontrahenci",
        label: "Kontrahenci",
        group: "Nawigacja",
        keywords: "klienci firmy",
        run: () => go("/contractors"),
      },
      {
        id: "nav-reports",
        label: "Raporty",
        group: "Nawigacja",
        keywords: "raport miesięczny analiza",
        run: () => go("/reports"),
      },
      {
        id: "nav-taxes",
        label: "Podatki i ZUS",
        group: "Nawigacja",
        keywords: "pit ryczałt składki zdrowotna kalkulator",
        run: () => go("/podatki"),
      },
      {
        id: "nav-invoices",
        label: "Faktury",
        group: "Nawigacja",
        keywords: "faktura vat ksef",
        run: () => go("/faktury"),
      },
      {
        id: "nav-budgets",
        label: "Budżety",
        group: "Nawigacja",
        keywords: "budget limit",
        run: () => go("/budgets"),
      },
      {
        id: "nav-categories",
        label: "Kategorie",
        group: "Nawigacja",
        keywords: "tag etykieta",
        run: () => go("/categories"),
      },
      {
        id: "nav-settings",
        label: "Ustawienia",
        group: "Nawigacja",
        keywords: "settings config smtp ollama ksef",
        run: () => go("/settings"),
      },

      // ── Odkrywaj ──────────────────────────────────────────
      {
        id: "nav-graph",
        label: "Graf powiązań",
        group: "Odkrywaj",
        keywords: "wizualizacja d3 network mapa",
        run: () => go("/graph"),
      },
      {
        id: "nav-rules",
        label: "Reguły automatyzacji",
        group: "Odkrywaj",
        keywords: "automat kategoryzacja silnik",
        run: () => go("/rules"),
      },
      {
        id: "nav-projects",
        label: "Projekty",
        group: "Odkrywaj",
        keywords: "projekt grupowanie",
        run: () => go("/projects"),
      },
      {
        id: "nav-history",
        label: "Historia zmian",
        group: "Odkrywaj",
        keywords: "audit log dziennik",
        run: () => go("/historia"),
      },
      {
        id: "nav-knowledge",
        label: "Baza wiedzy",
        group: "Odkrywaj",
        keywords: "wiedza poradnik jdg",
        run: () => go("/wiedza"),
      },
      {
        id: "nav-indicators",
        label: "Wskaźniki",
        group: "Odkrywaj",
        keywords: "kpi metryki analiza",
        run: () => go("/wskazniki"),
      },
      {
        id: "nav-cycle",
        label: "Cykl finansowy",
        group: "Odkrywaj",
        keywords: "cashflow cykl przepływ",
        run: () => go("/cykl"),
      },
      {
        id: "nav-ai",
        label: "Demo AI",
        group: "Odkrywaj",
        keywords: "ollama sztuczna inteligencja analiza",
        run: () => go("/ai-demo"),
      },
    ],
    [go, lock]
  );

  if (!unlocked) return null;

  const groups = Array.from(new Set(commands.map((c) => c.group)));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[18vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className={cn(
              "w-full max-w-lg rounded-md border border-input bg-background shadow-xl overflow-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Paleta komend" shouldFilter>
              <div className="flex items-center border-b border-input px-3">
                <Command.Input
                  autoFocus
                  placeholder="Wpisz komendę lub szukaj…"
                  className="flex h-11 w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  esc zamyka
                </span>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  Brak pasujących komend.
                </Command.Empty>
                {groups.map((group) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {commands
                      .filter((c) => c.group === group)
                      .map((c) => (
                        <Command.Item
                          key={c.id}
                          value={`${c.label} ${c.keywords ?? ""}`}
                          onSelect={() => c.run()}
                          className="flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                        >
                          <span>{c.label}</span>
                        </Command.Item>
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
