"use client";
import { useState, useMemo } from "react";
import { TransactionForm } from "./TransactionForm";
import { CSVImportDialog } from "./CSVImportDialog";
import { MonthLocker } from "./MonthLocker";
import { Pencil, Trash2, Search, ChevronUp, ChevronDown, Plus, Upload, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns";
import {
  useVaultTransactions,
  useVaultDeleteTransaction,
  useVaultBulkDelete,
} from "@/hooks/useVaultTransactions";
import { formatCurrency } from "@/lib/formatters";
import type { StoredTx, TxFilters } from "@/lib/vault-queries";
import { PageWrapper } from "@/components/layout/PageWrapper";

// ── Types ──────────────────────────────────────────────────────────────────

type SortField = "date" | "amount" | "description";
type PeriodPreset = "month" | "prev_month" | "quarter" | "year" | "custom" | "all";

// ── Period helpers ─────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  month: "Ten miesiac",
  prev_month: "Poprzedni miesiac",
  quarter: "Ten kwartal",
  year: "Ten rok",
  custom: "Wlasny zakres",
  all: "Wszystkie",
};

function getPeriodDates(preset: PeriodPreset, customFrom: string, customTo: string) {
  const now = new Date();
  switch (preset) {
    case "month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
    case "prev_month": {
      const prev = subMonths(now, 1);
      return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(endOfMonth(prev), "yyyy-MM-dd") };
    }
    case "quarter":
      return { from: format(startOfQuarter(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
    case "year":
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
    case "custom":
      return { from: customFrom, to: customTo };
    case "all":
      return { from: "", to: "" };
  }
}

function formatTxDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return date.getFullYear() === now.getFullYear()
    ? `${dd}.${mm}`
    : `${dd}.${mm}.${String(date.getFullYear()).slice(2)}`;
}

function fmtPLN(n: number, currency = "PLN") {
  return formatCurrency(n, currency);
}

// ── Bulk delete modal ──────────────────────────────────────────────────────

function BulkDeleteModal({
  count, periodLabel, onCancel, onConfirm, isPending,
}: {
  count: number; periodLabel: string;
  onCancel: () => void; onConfirm: () => void; isPending: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} onClick={onCancel} />

      <div style={{ position: "relative", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, maxWidth: 460, width: "100%", padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 4, background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={15} style={{ color: "var(--red)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--text-1)" }}>
            Usun transakcje
          </span>
        </div>

        {step === 1 && (
          <>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 12px" }}>
              Zamierzasz usunac <strong style={{ color: "var(--text-1)" }}>{count}</strong> transakcji
              {periodLabel !== "Wszystkie" && <> z okresu <strong style={{ color: "var(--text-1)" }}>{periodLabel.toLowerCase()}</strong></>}.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--red)", margin: "0 0 24px" }}>
              Ta operacja jest nieodwracalna. Usunietych danych nie mozna przywrocic.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onCancel} style={btnStyle("ghost")}>Anuluj</button>
              <button onClick={() => setStep(2)} style={btnStyle("danger-outline")}>Rozumiem, dalej</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 16px" }}>
              Wpisz <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-1)" }}>USUN</strong> aby potwierdzic:
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="USUN"
              style={{
                width: "100%", padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 15,
                background: "var(--surface)", border: `1px solid ${typed === "USUN" ? "var(--red)" : "var(--border)"}`,
                borderRadius: 4, outline: "none", color: "var(--text-1)", marginBottom: 20,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onCancel} style={btnStyle("ghost")}>Anuluj</button>
              <button
                onClick={onConfirm}
                disabled={typed !== "USUN" || isPending}
                style={btnStyle("danger", typed !== "USUN" || isPending)}
              >
                {isPending ? "Usuwam..." : `Usun ${count} transakcji`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(variant: "ghost" | "danger" | "danger-outline", disabled = false): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 13, padding: "8px 16px",
    borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer", border: "1px solid",
    transition: "all 120ms", opacity: disabled ? 0.45 : 1,
  };
  if (variant === "ghost")
    return { ...base, background: "transparent", borderColor: "var(--border)", color: "var(--text-2)" };
  if (variant === "danger-outline")
    return { ...base, background: "transparent", borderColor: "var(--red)", color: "var(--red)" };
  return { ...base, background: "var(--red)", borderColor: "var(--red)", color: "#fff" };
}

// ── Main component ─────────────────────────────────────────────────────────

export function TransactionsClient() {
  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "przychod" | "wydatek">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Period
  const [period, setPeriod] = useState<PeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const { from, to } = getPeriodDates(period, customFrom, customTo);

  // Modals
  const [editTx, setEditTx] = useState<StoredTx | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Vault-backed queries
  const filters: TxFilters = useMemo(() => ({
    search: search || undefined,
    type: typeFilter !== "ALL" ? typeFilter : undefined,
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
    from: from || undefined,
    to: to || undefined,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  }), [search, typeFilter, categoryFilter, from, to, sortBy, sortDir, page]);

  const { data, isLoading, allTxs } = useVaultTransactions(filters);
  const deleteMutation = useVaultDeleteTransaction();
  const bulkDeleteMutation = useVaultBulkDelete();

  // Get unique categories from all transactions
  const categories = useMemo(() => {
    if (!allTxs) return [];
    const cats = new Set<string>();
    for (const tx of allTxs) {
      if (tx.data.category) cats.add(tx.data.category);
    }
    return Array.from(cats).sort();
  }, [allTxs]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const viewIncome = data.items.filter((t) => t.data.type === "przychod").reduce((s, t) => s + Math.abs(t.data.amount), 0);
  const viewExpense = data.items.filter((t) => t.data.type === "wydatek").reduce((s, t) => s + Math.abs(t.data.amount), 0);

  const handleBulkDelete = () => {
    // Get all IDs matching current filters (without pagination)
    if (!allTxs) return;
    const allFiltered = allTxs.filter((t) => {
      if (typeFilter !== "ALL" && t.data.type !== typeFilter) return false;
      if (categoryFilter !== "ALL" && t.data.category !== categoryFilter) return false;
      if (from && t.data.date < from) return false;
      if (to && t.data.date > to) return false;
      return true;
    });
    bulkDeleteMutation.mutate(allFiltered.map((t) => t.id), {
      onSuccess: () => { setBulkDeleteOpen(false); setPage(1); },
    });
  };

  // ── Column header helper ────────────────────────────────────────────────

  function ColHeader({ field, label, align = "left" }: { field: SortField; label: string; align?: string }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        style={{
          padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
          color: active ? "var(--text-1)" : "var(--text-2)", textTransform: "uppercase",
          letterSpacing: "0.06em", cursor: "pointer", userSelect: "none",
          textAlign: align as React.CSSProperties["textAlign"],
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          {label}
          {active && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
        </span>
      </th>
    );
  }

  return (
    <PageWrapper title="Transakcje" maxWidth="xl" actions={
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <MonthLocker />
        <Btn icon={<Upload size={13} />} label="Import CSV" onClick={() => setCsvOpen(true)} />
        <Btn icon={<Plus size={13} />} label="Dodaj" onClick={() => { setEditTx(null); setFormOpen(true); }} primary />
      </div>
    }>

      {/* ── Period selector ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setPage(1); }}
            style={{
              padding: "5px 12px", borderRadius: 4, border: "1px solid",
              fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
              background: period === p ? "var(--text-1)" : "transparent",
              borderColor: period === p ? "var(--text-1)" : "var(--border)",
              color: period === p ? "var(--bg)" : "var(--text-2)",
              transition: "all 120ms",
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        {period === "custom" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 4 }}>
            <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
              style={dateInputStyle} />
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
            <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
              style={dateInputStyle} />
          </div>
        )}
      </div>

      {/* ── Filters row ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }} />
          <input
            placeholder="Szukaj..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ ...filterInputStyle, paddingLeft: 30 }}
          />
        </div>

        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1); }} style={filterInputStyle}>
          <option value="ALL">Wszystkie typy</option>
          <option value="przychod">Przychody</option>
          <option value="wydatek">Wydatki</option>
        </select>

        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={{ ...filterInputStyle, maxWidth: 180 }}>
          <option value="ALL">Wszystkie kategorie</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {data.total > 0 && (
          <button
            onClick={() => setBulkDeleteOpen(true)}
            style={{ padding: "5px 12px", borderRadius: 4, border: "1px solid var(--border)", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--red)", background: "transparent", cursor: "pointer", opacity: 0.7 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.borderColor = "var(--red)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            Usun zaznaczone...
          </button>
        )}
      </div>

      {/* ── Summary strip ────────────────────────────────────────────────────── */}
      {data.total > 0 && (
        <div style={{ display: "flex", gap: 20, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          <span style={{ color: "var(--text-3)" }}>{data.total} transakcji</span>
          <span style={{ color: "var(--text-3)" }}>·</span>
          <span style={{ color: "var(--green)" }}>+{fmtPLN(viewIncome)}</span>
          <span style={{ color: "var(--text-3)" }}>·</span>
          <span style={{ color: "var(--red)" }}>-{fmtPLN(viewExpense)}</span>
          <span style={{ color: "var(--text-3)" }}>·</span>
          <span style={{ color: (viewIncome - viewExpense) >= 0 ? "var(--green)" : "var(--red)" }}>
            {(viewIncome - viewExpense) >= 0 ? "+" : "-"}{fmtPLN(Math.abs(viewIncome - viewExpense))}
          </span>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <ColHeader field="date" label="Data" />
                <ColHeader field="description" label="Opis" />
                <th style={thStyle}>Kategoria</th>
                <ColHeader field="amount" label="Kwota" align="right" />
                <th style={{ ...thStyle, width: 64 }} />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} style={{ padding: "10px 12px" }}>
                          <div style={{ height: 14, background: "var(--surface)", borderRadius: 2 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.items.length === 0
                ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "32px 12px", textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-3)" }}>
                      Brak transakcji w wybranym okresie
                    </td>
                  </tr>
                )
                : data.items.map((tx) => {
                  const isIncome = tx.data.type === "przychod";
                  const cur = tx.data.currency || "PLN";
                  return (
                    <tr
                      key={tx.id}
                      style={{ borderTop: "1px solid var(--border)" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--surface)"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        {formatTxDate(tx.data.date)}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: "var(--text-1)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.data.description}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        {tx.data.category && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 7px", borderRadius: 2, background: "var(--surface2)", color: "var(--text-2)", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
                            {tx.data.category}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: isIncome ? "var(--green)" : "var(--red)" }}>
                          {isIncome ? "+" : "-"}{fmtPLN(Math.abs(tx.data.amount), cur)}
                        </span>
                        {tx.data.amount_net != null && tx.data.amount_gross != null && (
                          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                            netto {fmtPLN(tx.data.amount_net, cur)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "9px 8px" }}>
                        <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                          <IconBtn icon={<Pencil size={13} />} onClick={() => { setEditTx(tx); setFormOpen(true); }} />
                          <IconBtn icon={<Trash2 size={13} />} onClick={() => deleteMutation.mutate(tx.id)} danger />
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
          <PagBtn label="<" onClick={() => setPage((p) => p - 1)} disabled={page === 1} />
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..."
                ? <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>...</span>
                : <PagBtn key={p} label={String(p)} onClick={() => setPage(p as number)} active={p === page} />
            )}
          <PagBtn label=">" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} />
        </div>
      )}

      {/* ── Bulk delete modal ─────────────────────────────────────────────────── */}
      {bulkDeleteOpen && (
        <BulkDeleteModal
          count={data.total}
          periodLabel={PERIOD_LABELS[period]}
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
          isPending={bulkDeleteMutation.isPending}
        />
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editTx={editTx ? {
          id: editTx.id,
          amount: editTx.data.amount,
          date: editTx.data.date,
          description: editTx.data.description,
          contractor: null,
          contractorId: editTx.data.kontrahent_id ?? null,
          invoiceId: null,
          type: editTx.data.type === "przychod" ? "INCOME" : "EXPENSE",
          category: { id: editTx.data.category ?? "", name: editTx.data.category ?? "", emoji: "", color: "", type: editTx.data.type === "przychod" ? "INCOME" : "EXPENSE" },
        } : null}
        categories={[]}
      />
      <CSVImportDialog open={csvOpen} onClose={() => setCsvOpen(false)} categories={[]} />
    </PageWrapper>
  );
}

// ── Mini helpers ──────────────────────────────────────────────────────────

function Btn({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
      borderRadius: 4, border: "1px solid", fontFamily: "var(--font-sans)", fontSize: 13,
      cursor: "pointer", transition: "all 120ms",
      background: primary ? "var(--text-1)" : "transparent",
      borderColor: primary ? "var(--text-1)" : "var(--border)",
      color: primary ? "var(--bg)" : "var(--text-2)",
    }}>
      {icon}{label}
    </button>
  );
}

function IconBtn({ icon, onClick, danger = false }: { icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, border: "none", borderRadius: 4, background: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", color: danger ? "var(--red)" : "var(--text-3)", opacity: 0.7,
      transition: "opacity 100ms",
    }}
    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
    >
      {icon}
    </button>
  );
}

function PagBtn({ label, onClick, disabled = false, active = false }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 30, height: 30, padding: "0 6px", border: "1px solid",
      borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12, cursor: disabled ? "default" : "pointer",
      background: active ? "var(--text-1)" : "transparent",
      borderColor: active ? "var(--text-1)" : "var(--border)",
      color: active ? "var(--bg)" : disabled ? "var(--text-3)" : "var(--text-2)",
      opacity: disabled ? 0.4 : 1,
    }}>
      {label}
    </button>
  );
}

const filterInputStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4,
  fontFamily: "var(--font-sans)", fontSize: 13, background: "var(--bg)",
  color: "var(--text-1)", outline: "none", height: 34,
};

const dateInputStyle: React.CSSProperties = {
  ...filterInputStyle, fontFamily: "var(--font-mono)", fontSize: 12, width: 130,
};

const thStyle: React.CSSProperties = {
  padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
  color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em",
  background: "var(--surface)", borderBottom: "1px solid var(--border)", textAlign: "left",
};
