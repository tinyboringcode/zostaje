"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Unlock, ChevronDown } from "lucide-react";
import { monthLabel } from "@/lib/formatters";

interface LockedMonth { id: string; month: string; lockedAt: string; note: string; }

function getPrevMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthLocker() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getPrevMonth());
  const [note, setNote] = useState("");

  const { data: locked = [] } = useQuery<LockedMonth[]>({
    queryKey: ["locked-months"],
    queryFn: () => fetch("/api/months/lock").then((r) => r.json()),
    staleTime: 30_000,
  });

  const lockMutation = useMutation({
    mutationFn: (action: "lock" | "unlock") =>
      fetch("/api/months/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, note, action }),
      }).then((r) => r.json()),
    onSuccess: (data, action) => {
      qc.invalidateQueries({ queryKey: ["locked-months"] });
      if (action === "lock") {
        toast.success(`Miesiąc ${monthLabel(selectedMonth)} zamknięty — edycja zablokowana`);
      } else {
        toast.success(`Miesiąc ${monthLabel(selectedMonth)} odblokowany`);
      }
      setOpen(false);
      setNote("");
    },
    onError: () => toast.error("Błąd operacji"),
  });

  const isLocked = locked.some((l) => l.month === selectedMonth);
  const lockedCount = locked.length;

  // Last 12 months options
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border bg-background hover:bg-muted transition-colors"
        title="Zarządzaj zamknięciem miesięcy"
      >
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Zamknij miesiąc</span>
        {lockedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
            {lockedCount}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-background border rounded-xl shadow-xl p-4 space-y-3">
            <div className="font-medium text-sm">Zamknij okres rozliczeniowy</div>
            <p className="text-xs text-muted-foreground">
              Zamknięcie miesiąca blokuje edycję transakcji i generuje podsumowanie. Możesz odblokować w dowolnym momencie.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium">Wybierz miesiąc</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-sm px-2 py-1.5 rounded-md border bg-background"
              >
                {months.map((m) => {
                  const isLk = locked.some((l) => l.month === m);
                  return (
                    <option key={m} value={m}>
                      {monthLabel(m)}{isLk ? " 🔒" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {!isLocked && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Notatka (opcjonalnie)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="np. Rozliczenie przekazane do księgowego"
                  className="w-full text-xs px-2 py-1.5 rounded-md border bg-background"
                />
              </div>
            )}

            {locked.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Zamknięte miesiące:</div>
                <div className="flex flex-wrap gap-1">
                  {locked.slice(0, 6).map((l) => (
                    <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] border border-amber-200">
                      <Lock className="h-2.5 w-2.5" />
                      {monthLabel(l.month)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors"
              >
                Anuluj
              </button>
              {isLocked ? (
                <button
                  onClick={() => lockMutation.mutate("unlock")}
                  disabled={lockMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  <Unlock className="h-3 w-3" />
                  Odblokuj
                </button>
              ) : (
                <button
                  onClick={() => lockMutation.mutate("lock")}
                  disabled={lockMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  <Lock className="h-3 w-3" />
                  Zamknij miesiąc
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
