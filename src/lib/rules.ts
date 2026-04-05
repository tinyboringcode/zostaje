/**
 * Rules engine — pure functions.
 *
 * A rule is a set of conditions (AND) plus a set of actions applied to
 * a transaction draft before it is saved. Rules run in priority order
 * (lower number first). By default, the first matching rule wins and
 * later rules are skipped; set `rule.cascade = true` to let subsequent
 * rules also apply.
 *
 * `applyRules` is pure: it returns a new draft and never mutates the input.
 * Side effects (audit logging, match_count increments) are opt-in via
 * the `onMatch` callback so the core can stay test-friendly.
 */

import type {
  Rule,
  RuleCondition,
  RuleAction,
  TransactionDraft,
} from "./types";

export type ApplyRulesOptions = {
  onMatch?: (rule: Rule, before: TransactionDraft, after: TransactionDraft) => void;
};

// ── Condition matching ────────────────────────────────────────────────────

function readField(
  draft: TransactionDraft,
  field: RuleCondition["field"]
): string | number | undefined {
  switch (field) {
    case "description":
      return draft.description ?? "";
    case "amount":
      return draft.amount;
    case "kontrahent_id":
      return draft.kontrahent_id ?? "";
    case "type":
      return draft.type;
  }
}

function matchCondition(draft: TransactionDraft, cond: RuleCondition): boolean {
  const raw = readField(draft, cond.field);
  switch (cond.operator) {
    case "contains": {
      if (typeof raw !== "string") return false;
      return raw.toLowerCase().includes(String(cond.value).toLowerCase());
    }
    case "starts_with": {
      if (typeof raw !== "string") return false;
      return raw.toLowerCase().startsWith(String(cond.value).toLowerCase());
    }
    case "equals": {
      if (typeof raw === "number") return raw === Number(cond.value);
      return String(raw ?? "") === String(cond.value);
    }
    case "gt": {
      if (typeof raw !== "number") return false;
      return raw > Number(cond.value);
    }
    case "lt": {
      if (typeof raw !== "number") return false;
      return raw < Number(cond.value);
    }
  }
}

export function matchesRule(draft: TransactionDraft, rule: Rule): boolean {
  if (!rule.enabled) return false;
  if (!rule.conditions.length) return false;
  return rule.conditions.every((c) => matchCondition(draft, c));
}

// ── Action application ────────────────────────────────────────────────────

function applyAction(draft: TransactionDraft, action: RuleAction): TransactionDraft {
  switch (action.type) {
    case "set_category":
      return { ...draft, category: action.value };
    case "set_kontrahent":
      return { ...draft, kontrahent_id: action.value };
    case "set_type":
      return {
        ...draft,
        type: action.value === "przychod" ? "przychod" : "wydatek",
      };
    case "add_tag": {
      const existing = draft.tags ?? [];
      if (existing.includes(action.value)) return draft;
      return { ...draft, tags: [...existing, action.value] };
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export function applyRules(
  draft: TransactionDraft,
  rules: Rule[],
  opts: ApplyRulesOptions = {}
): TransactionDraft {
  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  let current: TransactionDraft = { ...draft };
  for (const rule of sorted) {
    if (!matchesRule(current, rule)) continue;
    const next = rule.actions.reduce(applyAction, current);
    opts.onMatch?.(rule, current, next);
    current = next;
    if (!rule.cascade) break;
  }
  return current;
}

/** Count how many of the given transactions a rule would match right now. */
export function countMatches(rule: Rule, transactions: TransactionDraft[]): number {
  return transactions.filter((t) => matchesRule(t, rule)).length;
}

// ── Starter rules seeded on first launch ──────────────────────────────────

export function starterRules(): Omit<Rule, never>[] {
  const now = new Date().toISOString();
  return [
    {
      name: "ZUS → kategoria ZUS",
      conditions: [{ field: "description", operator: "contains", value: "ZUS" }],
      actions: [
        { type: "set_type", value: "wydatek" },
        { type: "set_category", value: "ZUS" },
      ],
      enabled: true,
      priority: 10,
      created_at: now,
      match_count: 0,
    },
    {
      name: "Urząd skarbowy → Podatki",
      conditions: [{ field: "description", operator: "contains", value: "urząd skarbowy" }],
      actions: [{ type: "set_category", value: "Podatki" }],
      enabled: true,
      priority: 20,
      created_at: now,
      match_count: 0,
    },
    {
      name: "Duże transakcje",
      conditions: [{ field: "amount", operator: "gt", value: 10000 }],
      actions: [{ type: "add_tag", value: "duża-transakcja" }],
      enabled: true,
      priority: 30,
      created_at: now,
      match_count: 0,
    },
  ];
}
