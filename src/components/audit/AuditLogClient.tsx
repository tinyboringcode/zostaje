"use client";

import { useState, useEffect, useCallback } from "react";
import { useVault } from "@/components/vault/VaultProvider";
import { listAudit, clearAudit, type AuditEntry, type AuditAction, type AuditEntity } from "@/lib/audit";
import { formatDate } from "@/lib/formatters";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Trash2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Utworzono",
  update: "Zaktualizowano",
  delete: "Usunieto",
};

const ACTION_COLOR: Record<AuditAction, string> = {
  create: "var(--green)",
  update: "var(--blue, #4D9FE8)",
  delete: "var(--red)",
};

const ENTITY_LABEL: Record<AuditEntity, string> = {
  transaction: "Transakcja",
  kontrahent: "Kontrahent",
  setting: "Ustawienie",
  project: "Projekt",
  rule: "Regula",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${h}:${m}`;
}

function ChangeSummary({ before, after }: { before: unknown; after: unknown }) {
  if (!before && after) return <span style={{ color: "var(--text-3)", fontSize: 12 }}>Nowy rekord</span>;
  if (before && !after) return <span style={{ color: "var(--text-3)", fontSize: 12 }}>Rekord usuniety</span>;
  if (!before || !after) return null;

  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const changes: string[] = [];
  for (const key of Object.keys(a)) {
    if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
      changes.push(key);
    }
  }

  if (changes.length === 0) return <span style={{ color: "var(--text-3)", fontSize: 12 }}>Brak zmian</span>;
  return (
    <span style={{ color: "var(--text-3)", fontSize: 12 }}>
      Zmieniono: {changes.slice(0, 5).join(", ")}
      {changes.length > 5 && ` +${changes.length - 5}`}
    </span>
  );
}

export function AuditLogClient() {
  const { unlocked } = useVault();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Filters
  const [entityFilter, setEntityFilter] = useState<AuditEntity | "ALL">("ALL");
  const [actionFilter, setActionFilter] = useState<AuditAction | "ALL">("ALL");

  const load = useCallback(async () => {
    if (!unlocked) return;
    setLoading(true);
    try {
      const data = await listAudit(500);
      setEntries(data);
    } catch {
      toast.error("Nie udalo sie wczytac dziennika");
    } finally {
      setLoading(false);
    }
  }, [unlocked]);

  useEffect(() => { load(); }, [load]);

  const handleClear = async () => {
    if (!confirm("Wyczysc caly dziennik zmian? Tej operacji nie mozna cofnac.")) return;
    await clearAudit();
    setEntries([]);
    toast.success("Dziennik wyczyszczony");
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = entries.filter((e) => {
    if (entityFilter !== "ALL" && e.entity !== entityFilter) return false;
    if (actionFilter !== "ALL" && e.action !== actionFilter) return false;
    return true;
  });

  return (
    <PageWrapper
      title="Dziennik zmian"
      description="Zaszyfrowany log wszystkich operacji na danych"
      maxWidth="xl"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text-2)", fontFamily: "var(--font-sans)", fontSize: 12 }}
          >
            <RefreshCw size={12} /> Odswiez
          </button>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: 12 }}
            >
              <Trash2 size={12} /> Wyczysc
            </button>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value as AuditEntity | "ALL")}
          style={selectStyle}
        >
          <option value="ALL">Wszystkie typy</option>
          {(Object.keys(ENTITY_LABEL) as AuditEntity[]).map((k) => (
            <option key={k} value={k}>{ENTITY_LABEL[k]}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | "ALL")}
          style={selectStyle}
        >
          <option value="ALL">Wszystkie akcje</option>
          {(Object.keys(ACTION_LABEL) as AuditAction[]).map((k) => (
            <option key={k} value={k}>{ACTION_LABEL[k]}</option>
          ))}
        </select>

        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center" }}>
          {filtered.length} wpisow
        </span>
      </div>

      {/* Entries */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>Wczytywanie...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
          Brak wpisow w dzienniku
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {filtered.map((entry, i) => {
            const isExpanded = expanded.has(entry.id);
            return (
              <div key={entry.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <button
                  onClick={() => toggleExpand(entry.id)}
                  style={{
                    display: "grid", gridTemplateColumns: "20px 130px 100px 100px 1fr",
                    gap: 12, alignItems: "center", width: "100%", padding: "10px 14px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontFamily: "var(--font-sans)", fontSize: 13, textAlign: "left",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--surface)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {isExpanded ? <ChevronDown size={12} style={{ color: "var(--text-3)" }} /> : <ChevronRight size={12} style={{ color: "var(--text-3)" }} />}

                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
                    {formatTime(entry.timestamp)}
                  </span>

                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, fontWeight: 500, color: ACTION_COLOR[entry.action], background: `color-mix(in srgb, ${ACTION_COLOR[entry.action]} 10%, transparent)`, display: "inline-block", textAlign: "center" }}>
                    {ACTION_LABEL[entry.action]}
                  </span>

                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {ENTITY_LABEL[entry.entity]}
                  </span>

                  <ChangeSummary before={entry.before} after={entry.after} />
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 14px 14px 46px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {entry.before != null ? (
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 4 }}>Przed</div>
                          <pre style={{ margin: 0, padding: 10, background: "var(--surface)", borderRadius: 4, overflow: "auto", maxHeight: 200, fontSize: 11, lineHeight: 1.5 }}>
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                      {entry.after != null ? (
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 4 }}>Po</div>
                          <pre style={{ margin: 0, padding: 10, background: "var(--surface)", borderRadius: 4, overflow: "auto", maxHeight: 200, fontSize: 11, lineHeight: 1.5 }}>
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
                      ID: {entry.entityId}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4,
  fontFamily: "var(--font-sans)", fontSize: 12, background: "var(--bg)",
  color: "var(--text-1)", outline: "none", height: 32,
};
