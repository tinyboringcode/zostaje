"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: string;
}

interface Budget {
  id: string;
  categoryId: string;
  month: string;
  limitAmount: number;
  category: Category;
}

interface Spending {
  [categoryId: string]: number;
}

export function BudgetsClient() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [newCatId, setNewCatId] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [alertedBudgets, setAlertedBudgets] = useState<Set<string>>(new Set());

  const { data: budgets, isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ["budgets", month],
    queryFn: () => fetch(`/api/budgets?month=${month}`).then((r) => r.json()),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  // Get actual spending for the month
  const [monthStart, monthEnd] = (() => {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 0, 23, 59, 59).toISOString();
    return [start, end];
  })();

  const { data: txData } = useQuery<{ items: { amount: number; type: string; categoryId: string }[] }>({
    queryKey: ["transactions-budget", month],
    queryFn: () =>
      fetch(`/api/transactions?from=${monthStart}&to=${monthEnd}&type=EXPENSE&limit=1000`).then((r) => r.json()),
  });

  const spending: Spending = {};
  txData?.items.forEach((tx) => {
    spending[tx.categoryId] = (spending[tx.categoryId] ?? 0) + tx.amount;
  });

  // Budget alerts
  useEffect(() => {
    if (!budgets) return;
    budgets.forEach((b) => {
      const spent = spending[b.categoryId] ?? 0;
      const pct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
      const key80 = `${b.id}-80`;
      const key100 = `${b.id}-100`;
      if (pct >= 100 && !alertedBudgets.has(key100)) {
        toast.error(`Przekroczono budżet: ${b.category.emoji} ${b.category.name}`, { duration: 6000 });
        setAlertedBudgets((prev) => new Set(prev).add(key100));
      } else if (pct >= 80 && !alertedBudgets.has(key80)) {
        toast.warning(`80% budżetu: ${b.category.emoji} ${b.category.name}`, { duration: 5000 });
        setAlertedBudgets((prev) => new Set(prev).add(key80));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets]);

  const addMutation = useMutation({
    mutationFn: () =>
      fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: newCatId, month, limitAmount: newLimit }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets", month] });
      toast.success("Budżet zapisany");
      setNewCatId("");
      setNewLimit("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets", month] });
      toast.success("Budżet usunięty");
    },
  });

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));

  const expenseCategories = categories?.filter((c) => c.type === "EXPENSE") ?? [];
  const usedCategoryIds = new Set(budgets?.map((b) => b.categoryId) ?? []);
  const availableCategories = expenseCategories.filter((c) => !usedCategoryIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budżety</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const d = new Date(y, m - 2, 1);
            setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }} className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent">‹</button>
          <span className="text-sm font-medium min-w-[130px] text-center capitalize">{monthLabel}</span>
          <button onClick={() => {
            const d = new Date(y, m, 1);
            setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }} className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent">›</button>
        </div>
      </div>

      {/* Add budget form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dodaj limit budżetowy</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-48">
              <Label>Kategoria</Label>
              <Select value={newCatId} onValueChange={setNewCatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-36">
              <Label>Limit (PLN)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="np. 2000"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
              />
            </div>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newCatId || !newLimit || addMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Budget list */}
      <div className="space-y-3">
        {budgetsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))
        ) : !budgets || budgets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Brak budżetów na ten miesiąc. Dodaj pierwszy limit powyżej.
          </div>
        ) : (
          budgets.map((b) => {
            const spent = spending[b.categoryId] ?? 0;
            const pct = b.limitAmount > 0 ? Math.min((spent / b.limitAmount) * 100, 100) : 0;
            const rawPct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
            const barColor = rawPct >= 100 ? "bg-red-500" : rawPct >= 80 ? "bg-yellow-500" : "bg-green-500";
            const textColor = rawPct >= 100 ? "text-red-600 dark:text-red-400" : rawPct >= 80 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400";

            return (
              <Card key={b.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-medium">
                        {b.category.emoji} {b.category.name}
                      </span>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {formatCurrency(spent)} / {formatCurrency(b.limitAmount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${textColor}`}>{rawPct.toFixed(0)}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(b.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {rawPct > 100 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Przekroczono o {formatCurrency(spent - b.limitAmount)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
