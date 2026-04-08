/**
 * Computed views over vault data.
 *
 * These helpers replace server-side API queries with client-side
 * computations over `storage.getAll("transaction")`.
 * Used by DashboardHub, ReportsClient, TaxesClient.
 */

import * as storage from "./storage";
import type { TransactionDraft } from "./types";
import { toMonthKey } from "./formatters";

export type StoredTx = storage.StoredEntity<TransactionDraft>;

// ── Fetch all transactions from vault ─────────────────────────────────────

export async function getAllTransactions(): Promise<StoredTx[]> {
  return storage.getAll<TransactionDraft>("transaction");
}

// ── Monthly aggregation (replaces /api/reports/monthly) ───────────────────

export interface MonthlyRow {
  income: number;
  expense: number;
  profit: number;
}

export function aggregateMonthly(
  txs: StoredTx[],
  year: number,
): Record<string, MonthlyRow> {
  const out: Record<string, MonthlyRow> = {};
  // pre-fill 12 months
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    out[key] = { income: 0, expense: 0, profit: 0 };
  }
  for (const tx of txs) {
    const d = new Date(tx.data.date);
    if (d.getFullYear() !== year) continue;
    const key = toMonthKey(d);
    if (!out[key]) continue;
    const amt = Math.abs(tx.data.amount);
    if (tx.data.type === "przychod") {
      out[key].income += amt;
    } else {
      out[key].expense += amt;
    }
    out[key].profit = out[key].income - out[key].expense;
  }
  return out;
}

// ── Category aggregation (replaces /api/reports/category) ─────────────────

export interface CategoryRow {
  category: string;
  total: number;
  type: string;
}

export function aggregateByCategory(
  txs: StoredTx[],
  year: number,
): CategoryRow[] {
  const map = new Map<string, { total: number; type: string }>();
  for (const tx of txs) {
    const d = new Date(tx.data.date);
    if (d.getFullYear() !== year) continue;
    const cat = tx.data.category || "Bez kategorii";
    const prev = map.get(cat) ?? { total: 0, type: tx.data.type };
    prev.total += Math.abs(tx.data.amount);
    map.set(cat, prev);
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);
}

// ── Widget data for dashboard (replaces /api/widgets) ─────────────────────

export interface WidgetData {
  income: number;
  expense: number;
  profit: number;
  txCount: number;
}

export function computeWidgets(txs: StoredTx[], monthKey: string): WidgetData {
  let income = 0;
  let expense = 0;
  let txCount = 0;
  for (const tx of txs) {
    if (toMonthKey(tx.data.date) !== monthKey) continue;
    txCount++;
    const amt = Math.abs(tx.data.amount);
    if (tx.data.type === "przychod") income += amt;
    else expense += amt;
  }
  return { income, expense, profit: income - expense, txCount };
}

// ── Filter/sort/paginate for TransactionsClient ───────────────────────────

export interface TxFilters {
  search?: string;
  type?: "przychod" | "wydatek";
  category?: string;
  from?: string;
  to?: string;
  sortBy?: "date" | "amount" | "description";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export function filterTransactions(
  txs: StoredTx[],
  filters: TxFilters,
): { items: StoredTx[]; total: number } {
  let items = [...txs];

  // Filter by type
  if (filters.type) {
    items = items.filter((t) => t.data.type === filters.type);
  }

  // Filter by category
  if (filters.category) {
    items = items.filter((t) => t.data.category === filters.category);
  }

  // Filter by date range
  if (filters.from) {
    items = items.filter((t) => t.data.date >= filters.from!);
  }
  if (filters.to) {
    items = items.filter((t) => t.data.date <= filters.to!);
  }

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (t) =>
        t.data.description.toLowerCase().includes(q) ||
        (t.data.category ?? "").toLowerCase().includes(q) ||
        (t.data.notes ?? "").toLowerCase().includes(q),
    );
  }

  const total = items.length;

  // Sort
  const sortBy = filters.sortBy ?? "date";
  const dir = filters.sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    if (sortBy === "date") return dir * (a.data.date > b.data.date ? 1 : a.data.date < b.data.date ? -1 : 0);
    if (sortBy === "amount") return dir * (Math.abs(a.data.amount) - Math.abs(b.data.amount));
    return dir * a.data.description.localeCompare(b.data.description);
  });

  // Paginate
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const start = (page - 1) * pageSize;
  items = items.slice(start, start + pageSize);

  return { items, total };
}

// ── Recent transactions for dashboard ─────────────────────────────────────

export function recentTransactions(txs: StoredTx[], limit = 6): StoredTx[] {
  return [...txs]
    .sort((a, b) => (b.data.date > a.data.date ? 1 : b.data.date < a.data.date ? -1 : 0))
    .slice(0, limit);
}
