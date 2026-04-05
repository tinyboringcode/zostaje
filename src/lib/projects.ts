/**
 * Project helpers — thin wrappers around `storage.ts` plus summary
 * calculations that compute totals for transactions linked via
 * `transaction.project_id`.
 */

import { storage, type StoredEntity } from "./storage";
import type { Project, Transaction } from "./types";

export type StoredProject = StoredEntity<Project>;
export type StoredTransaction = StoredEntity<Transaction>;

export interface ProjectSummary {
  projectId: string;
  income: number;
  expense: number;
  result: number;
  count: number;
}

export async function listProjects(): Promise<StoredProject[]> {
  return storage.getAll<Project>("project");
}

export async function getProject(id: string): Promise<StoredProject | null> {
  return storage.getById<Project>("project", id);
}

export async function createProject(data: Project): Promise<StoredProject> {
  return storage.add<Project>("project", data);
}

export async function updateProject(
  id: string,
  patch: Partial<Project>
): Promise<StoredProject> {
  return storage.update<Project>("project", id, patch);
}

export async function deleteProject(id: string): Promise<void> {
  await storage.remove("project", id);
}

/**
 * Group transactions by project_id and compute income / expense / result.
 */
export function summarize(transactions: StoredTransaction[]): Map<string, ProjectSummary> {
  const out = new Map<string, ProjectSummary>();
  for (const t of transactions) {
    const pid = t.data.project_id;
    if (!pid) continue;
    const entry = out.get(pid) ?? {
      projectId: pid,
      income: 0,
      expense: 0,
      result: 0,
      count: 0,
    };
    if (t.data.type === "przychod") entry.income += t.data.amount;
    else entry.expense += t.data.amount;
    entry.result = entry.income - entry.expense;
    entry.count += 1;
    out.set(pid, entry);
  }
  return out;
}

export function transactionsForProject(
  projectId: string,
  transactions: StoredTransaction[]
): StoredTransaction[] {
  return transactions.filter((t) => t.data.project_id === projectId);
}
