"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storage, type StoredEntity } from "@/lib/storage";
import { applyRules, countMatches } from "@/lib/rules";
import type {
  Rule,
  RuleCondition,
  RuleAction,
  RuleField,
  RuleOperator,
  RuleActionType,
  Transaction,
  TransactionDraft,
} from "@/lib/types";
import { useVault } from "@/components/vault/VaultProvider";

type StoredRule = StoredEntity<Rule>;

const FIELD_OPTIONS: { value: RuleField; label: string }[] = [
  { value: "description", label: "Opis" },
  { value: "amount", label: "Kwota" },
  { value: "kontrahent_id", label: "Kontrahent" },
  { value: "type", label: "Typ" },
];

const OPERATORS_BY_FIELD: Record<RuleField, RuleOperator[]> = {
  description: ["contains", "starts_with", "equals"],
  amount: ["gt", "lt", "equals"],
  kontrahent_id: ["equals"],
  type: ["equals"],
};

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  contains: "zawiera",
  starts_with: "zaczyna się od",
  equals: "równe",
  gt: "większe niż",
  lt: "mniejsze niż",
};

const ACTION_OPTIONS: { value: RuleActionType; label: string }[] = [
  { value: "set_category", label: "Ustaw kategorię" },
  { value: "set_kontrahent", label: "Ustaw kontrahenta" },
  { value: "set_type", label: "Ustaw typ" },
  { value: "add_tag", label: "Dodaj tag" },
];

function summaryLine(rule: Rule): string {
  const cond = rule.conditions
    .map((c) => {
      const field = FIELD_OPTIONS.find((f) => f.value === c.field)?.label ?? c.field;
      return `${field} ${OPERATOR_LABELS[c.operator]} "${c.value}"`;
    })
    .join(" · ");
  const acts = rule.actions
    .map((a) => {
      const label = ACTION_OPTIONS.find((x) => x.value === a.type)?.label ?? a.type;
      return `${label}: ${a.value}`;
    })
    .join(", ");
  return `${cond} → ${acts} · zastosowano ${rule.match_count}×`;
}

function emptyRule(priority: number): Rule {
  return {
    name: "",
    conditions: [{ field: "description", operator: "contains", value: "" }],
    actions: [{ type: "set_category", value: "" }],
    enabled: true,
    priority,
    created_at: new Date().toISOString(),
    match_count: 0,
  };
}

export function RulesClient() {
  const { unlocked } = useVault();
  const [rules, setRules] = React.useState<StoredRule[]>([]);
  const [transactions, setTransactions] = React.useState<StoredEntity<Transaction>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<{ id?: string; data: Rule } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [rs, ts] = await Promise.all([
        storage.getAll<Rule>("rule"),
        storage.getAll<Transaction>("transaction"),
      ]);
      setRules(rs.sort((a, b) => a.data.priority - b.data.priority));
      setTransactions(ts);
    } catch {
      // vault locked
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  async function toggleEnabled(r: StoredRule) {
    await storage.update<Rule>("rule", r.id, { enabled: !r.data.enabled });
    await load();
  }

  async function deleteRule(id: string) {
    if (!confirm("Usunąć regułę?")) return;
    await storage.remove("rule", id);
    await load();
    toast.success("Reguła usunięta");
  }

  async function saveRule() {
    if (!editing) return;
    const clean: Rule = {
      ...editing.data,
      name: editing.data.name.trim() || "Nowa reguła",
      conditions: editing.data.conditions.filter(
        (c) => String(c.value).length > 0
      ),
    };
    if (clean.conditions.length === 0) {
      toast.error("Dodaj przynajmniej jeden warunek");
      return;
    }
    if (clean.actions.length === 0) {
      toast.error("Dodaj przynajmniej jedną akcję");
      return;
    }
    if (editing.id) {
      await storage.update<Rule>("rule", editing.id, clean);
    } else {
      await storage.add<Rule>("rule", clean);
    }
    setEditing(null);
    await load();
    toast.success("Reguła zapisana");
  }

  async function reapplyAll() {
    const allRules = rules.map((r) => r.data);
    let updated = 0;
    for (const t of transactions) {
      const before = t.data as TransactionDraft;
      const after = applyRules(before, allRules);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await storage.update<Transaction>("transaction", t.id, after);
        updated++;
      }
    }
    await load();
    toast.success(`Zastosowano reguły. Zmieniono ${updated} transakcji.`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reguły automatyczne</h1>
          <p className="text-sm text-muted-foreground">
            Automatyczna kategoryzacja transakcji. Reguły uruchamiają się przy zapisie każdej transakcji.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reapplyAll} disabled={!rules.length || !transactions.length}>
            Zastosuj reguły ponownie
          </Button>
          <Button
            onClick={() =>
              setEditing({ data: emptyRule((rules[rules.length - 1]?.data.priority ?? 0) + 10) })
            }
          >
            + Dodaj regułę
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Wczytuję…</p>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Brak reguł. Dodaj pierwszą aby automatycznie kategoryzować transakcje.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={r.data.enabled}
                    onChange={() => toggleEnabled(r)}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{r.data.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {summaryLine(r.data)}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    prio {r.data.priority}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ id: r.id, data: { ...r.data } })}>
                    Edytuj
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRule(r.id)}>
                    Usuń
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <RuleEditorModal
          state={editing}
          onChange={setEditing}
          onSave={saveRule}
          onCancel={() => setEditing(null)}
          transactions={transactions}
        />
      )}
    </div>
  );
}

// ── Editor modal ─────────────────────────────────────────────────────────

interface EditorProps {
  state: { id?: string; data: Rule };
  onChange: (s: { id?: string; data: Rule }) => void;
  onSave: () => void;
  onCancel: () => void;
  transactions: StoredEntity<Transaction>[];
}

function RuleEditorModal({ state, onChange, onSave, onCancel, transactions }: EditorProps) {
  const rule = state.data;

  const liveMatchCount = React.useMemo(
    () => countMatches(rule, transactions.map((t) => t.data as TransactionDraft)),
    [rule, transactions]
  );

  function setField<K extends keyof Rule>(k: K, v: Rule[K]) {
    onChange({ ...state, data: { ...rule, [k]: v } });
  }

  function updateCondition(i: number, patch: Partial<RuleCondition>) {
    const next = rule.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setField("conditions", next);
  }

  function addCondition() {
    setField("conditions", [
      ...rule.conditions,
      { field: "description", operator: "contains", value: "" },
    ]);
  }

  function removeCondition(i: number) {
    setField(
      "conditions",
      rule.conditions.filter((_, idx) => idx !== i)
    );
  }

  function updateAction(i: number, patch: Partial<RuleAction>) {
    const next = rule.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    setField("actions", next);
  }

  function addAction() {
    setField("actions", [...rule.actions, { type: "set_category", value: "" }]);
  }

  function removeAction(i: number) {
    setField("actions", rule.actions.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[10vh]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl rounded-md border border-input bg-background shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              {state.id ? "Edytuj regułę" : "Nowa reguła"}
            </h2>
          </div>

          <div className="space-y-2">
            <Label>Nazwa reguły</Label>
            <Input
              value={rule.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="np. Biedronka → Materiały"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Warunki (wszystkie muszą być spełnione)</Label>
              <Button size="sm" variant="ghost" onClick={addCondition}>
                + warunek
              </Button>
            </div>
            {rule.conditions.map((c, i) => {
              const ops = OPERATORS_BY_FIELD[c.field];
              return (
                <div key={i} className="flex gap-2">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={c.field}
                    onChange={(e) => {
                      const field = e.target.value as RuleField;
                      updateCondition(i, {
                        field,
                        operator: OPERATORS_BY_FIELD[field][0],
                      });
                    }}
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={c.operator}
                    onChange={(e) => updateCondition(i, { operator: e.target.value as RuleOperator })}
                  >
                    {ops.map((op) => (
                      <option key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={String(c.value)}
                    onChange={(e) =>
                      updateCondition(i, {
                        value: c.field === "amount" ? Number(e.target.value) : e.target.value,
                      })
                    }
                    placeholder="wartość"
                    type={c.field === "amount" ? "number" : "text"}
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeCondition(i)}>
                    ✕
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Akcje</Label>
              <Button size="sm" variant="ghost" onClick={addAction}>
                + akcja
              </Button>
            </div>
            {rule.actions.map((a, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={a.type}
                  onChange={(e) => updateAction(i, { type: e.target.value as RuleActionType })}
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={a.value}
                  onChange={(e) => updateAction(i, { value: e.target.value })}
                  placeholder={
                    a.type === "set_type"
                      ? "przychod | wydatek"
                      : a.type === "add_tag"
                      ? "nazwa taga"
                      : "wartość"
                  }
                />
                <Button size="sm" variant="ghost" onClick={() => removeAction(i)}>
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priorytet (niższy = wcześniej)</Label>
              <Input
                type="number"
                value={rule.priority}
                onChange={(e) => setField("priority", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kaskada</Label>
              <label className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={!!rule.cascade}
                  onChange={(e) => setField("cascade", e.target.checked)}
                />
                <span className="text-sm text-muted-foreground">
                  pozwól kolejnym regułom także zadziałać
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-md border border-input bg-muted/30 p-3 text-sm">
            Ta reguła dopasuje aktualnie{" "}
            <span className="font-semibold">{liveMatchCount}</span>{" "}
            {liveMatchCount === 1 ? "transakcję" : "transakcji"} z bieżących danych.
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Anuluj
            </Button>
            <Button onClick={onSave}>Zapisz regułę</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
