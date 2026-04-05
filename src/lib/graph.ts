/**
 * Graph data model + builder.
 *
 * Reads from the local vault (`storage.ts`) and assembles a typed node /
 * edge graph for the `/graph` view. Pure function — no d3 dependency here
 * (the renderer in `GraphView.tsx` owns the simulation).
 */

import { storage, type StoredEntity } from "./storage";
import type { Transaction, Kontrahent, Project } from "./types";

export type GraphNodeType =
  | "transaction"
  | "kontrahent"
  | "project"
  | "category"
  | "tag";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  value?: number;
  date?: string;
  // runtime hint for renderer
  meta?: {
    transactionType?: "przychod" | "wydatek";
    status?: string;
  };
}

export type GraphEdgeType = "belongs_to" | "linked_to" | "tagged_with";

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
  totalTransactions: number;
}

export interface GraphFilters {
  showKontrahenci: boolean;
  showProjekty: boolean;
  showTransakcje: boolean;
  showKategorie: boolean;
  /** ISO date string, inclusive */
  since?: string;
  /** ISO date string, inclusive */
  until?: string;
}

const MAX_TRANSACTIONS = 500;

export const DEFAULT_FILTERS: GraphFilters = {
  showKontrahenci: true,
  showProjekty: true,
  showTransakcje: true,
  showKategorie: true,
};

function inDateRange(iso: string | undefined, f: GraphFilters): boolean {
  if (!iso) return true;
  if (f.since && iso < f.since) return false;
  if (f.until && iso > f.until) return false;
  return true;
}

export async function buildGraph(filters: GraphFilters = DEFAULT_FILTERS): Promise<GraphData> {
  const [transactions, kontrahenci, projects] = await Promise.all([
    storage.getAll<Transaction>("transaction"),
    storage.getAll<Kontrahent>("kontrahent"),
    storage.getAll<Project>("project"),
  ]);

  // Filter transactions by date + cap at MAX_TRANSACTIONS (newest first).
  const sortedTx = [...transactions]
    .filter((t) => inDateRange(t.data.date, filters))
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  const totalTransactions = sortedTx.length;
  const visibleTx = sortedTx.slice(0, MAX_TRANSACTIONS);
  const truncated = totalTransactions > MAX_TRANSACTIONS;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const pushedCategories = new Set<string>();

  // Kontrahenci nodes
  if (filters.showKontrahenci) {
    for (const k of kontrahenci) {
      nodes.push({ id: `k:${k.id}`, type: "kontrahent", label: k.data.name });
    }
  }

  // Project nodes
  if (filters.showProjekty) {
    for (const p of projects) {
      nodes.push({
        id: `p:${p.id}`,
        type: "project",
        label: p.data.name,
        meta: { status: p.data.status },
      });
      if (filters.showKontrahenci && p.data.kontrahent_id) {
        edges.push({
          source: `p:${p.id}`,
          target: `k:${p.data.kontrahent_id}`,
          type: "linked_to",
        });
      }
    }
  }

  // Transaction nodes + derived category nodes + edges
  if (filters.showTransakcje) {
    for (const t of visibleTx) {
      const nodeId = `t:${t.id}`;
      nodes.push({
        id: nodeId,
        type: "transaction",
        label: t.data.description || "(bez opisu)",
        value: t.data.amount,
        date: t.data.date,
        meta: { transactionType: t.data.type },
      });

      if (filters.showKontrahenci && t.data.kontrahent_id) {
        edges.push({
          source: nodeId,
          target: `k:${t.data.kontrahent_id}`,
          type: "linked_to",
        });
      }
      if (filters.showProjekty && t.data.project_id) {
        edges.push({
          source: nodeId,
          target: `p:${t.data.project_id}`,
          type: "belongs_to",
        });
      }
      if (filters.showKategorie && t.data.category) {
        const catId = `c:${t.data.category}`;
        if (!pushedCategories.has(catId)) {
          pushedCategories.add(catId);
          nodes.push({ id: catId, type: "category", label: t.data.category });
        }
        edges.push({ source: nodeId, target: catId, type: "belongs_to" });
      }
    }
  }

  // Drop edges that reference filtered-out nodes.
  const nodeIds = new Set(nodes.map((n) => n.id));
  const cleanEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  return { nodes, edges: cleanEdges, truncated, totalTransactions };
}

/**
 * Size helper for transaction nodes — `Math.sqrt(amount)` keeps large amounts
 * visible without crushing small ones.
 */
export function nodeRadius(node: GraphNode): number {
  if (node.type === "transaction" && node.value) {
    return Math.max(4, Math.min(20, Math.sqrt(Math.abs(node.value)) / 2));
  }
  if (node.type === "kontrahent") return 10;
  if (node.type === "project") return 12;
  if (node.type === "category") return 8;
  return 6;
}

export function nodeColor(node: GraphNode): string {
  switch (node.type) {
    case "kontrahent":
      return "#a855f7"; // purple
    case "project":
      return "#14b8a6"; // teal
    case "category":
      return "#9ca3af"; // gray
    case "transaction":
      return node.meta?.transactionType === "przychod" ? "#10b981" : "#ef4444";
    case "tag":
      return "#f59e0b";
  }
}

/** How many transactions link to a given kontrahent (by id). */
export function countTxForKontrahent(
  kontrahentId: string,
  transactions: StoredEntity<Transaction>[]
): { income: number; expense: number; recent: StoredEntity<Transaction>[] } {
  const related = transactions.filter((t) => t.data.kontrahent_id === kontrahentId);
  let income = 0;
  let expense = 0;
  for (const t of related) {
    if (t.data.type === "przychod") income += t.data.amount;
    else expense += t.data.amount;
  }
  const recent = [...related]
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    .slice(0, 5);
  return { income, expense, recent };
}
