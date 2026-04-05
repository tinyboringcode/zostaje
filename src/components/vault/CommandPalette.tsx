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
  hint?: string;
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
      {
        id: "add-transaction",
        label: "Dodaj transakcję",
        run: () => go("/transactions?new=1"),
      },
      {
        id: "add-kontrahent",
        label: "Dodaj kontrahenta",
        run: () => go("/contractors?new=1"),
      },
      { id: "nav-overview", label: "Przejdź: Przegląd", run: () => go("/") },
      { id: "nav-transactions", label: "Przejdź: Transakcje", run: () => go("/transactions") },
      { id: "nav-taxes", label: "Przejdź: Podatki i ZUS", run: () => go("/podatki") },
      { id: "nav-kontrahenci", label: "Przejdź: Kontrahenci", run: () => go("/contractors") },
      {
        id: "export",
        label: "Eksportuj dane",
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
        run: () => {
          setOpen(false);
          lock();
        },
      },
    ],
    [go, lock]
  );

  if (!unlocked) return null;

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
                {commands.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={c.label}
                    onSelect={() => c.run()}
                    className="flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <span>{c.label}</span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
