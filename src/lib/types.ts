/**
 * Shared domain types for the local-first vault.
 *
 * These describe the *decrypted* shape of records stored in IndexedDB
 * via `src/lib/storage.ts`. They live in a dedicated file so rules,
 * projects, plugins, and UI code can all import a single source of truth.
 */

export type TransactionType = "przychod" | "wydatek";

export interface TransactionDraft {
  description: string;
  amount: number;
  type: TransactionType;
  currency?: string;
  date: string; // ISO date
  category?: string;
  kontrahent_id?: string;
  project_id?: string;
  tags?: string[];
  notes?: string;
}

// `id` / `updatedAt` live on the StoredEntity envelope, not here.
export type Transaction = TransactionDraft;

export interface Kontrahent {
  name: string;
  nip?: string;
  address?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export type ProjectStatus = "active" | "done" | "archived";

export interface Project {
  name: string;
  kontrahent_id?: string;
  status: ProjectStatus;
  color?: string;
  created_at: string; // ISO
  description?: string;
}

// ── Rules engine ──────────────────────────────────────────────────────────

export type RuleField = "description" | "amount" | "kontrahent_id" | "type";
export type RuleOperator = "contains" | "equals" | "gt" | "lt" | "starts_with";

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | number;
}

export type RuleActionType =
  | "set_category"
  | "set_kontrahent"
  | "set_type"
  | "add_tag";

export interface RuleAction {
  type: RuleActionType;
  value: string;
}

export interface Rule {
  name: string;
  conditions: RuleCondition[]; // ALL must match
  actions: RuleAction[];
  enabled: boolean;
  priority: number; // lower = runs first
  created_at: string;
  match_count: number;
  cascade?: boolean; // if true, matching does not stop; default false (first match wins)
}
