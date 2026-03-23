"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseTransactionInput, formatPLN, formatDateShort } from "@/lib/parse-transaction";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
  emoji: string;
  type: string;
}

interface RecentTx {
  id: string;
  amount: number;
  description: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  category: Category;
}

export function QuickAdd() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [keepOpen, setKeepOpen] = useState(false);

  // Overrides (set by chip buttons)
  const [typeOverride, setTypeOverride] = useState<"income" | "expense" | null>(null);
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [dateOverride, setDateOverride] = useState<string | null>(null); // yyyy-MM-dd
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = raw.trim() ? parseTransactionInput(raw) : null;
  const effectiveType = typeOverride ?? parsed?.type ?? "expense";
  const effectiveDate = dateOverride ? new Date(dateOverride) : (parsed?.date ?? new Date());
  const txType = effectiveType === "income" ? "INCOME" : "EXPENSE";

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
    enabled: open,
  });

  const { data: aiSuggestion } = useQuery<{ suggestion: { categoryId: string; confidence: number } | null }>({
    queryKey: ["categorize", raw, txType],
    queryFn: () =>
      fetch(`/api/categorize?q=${encodeURIComponent(raw)}&type=${txType}`).then((r) => r.json()),
    enabled: open && raw.length >= 4,
    staleTime: 5000,
  });

  const { data: recentTxs } = useQuery<RecentTx[]>({
    queryKey: ["recent-txs"],
    queryFn: () =>
      fetch("/api/transactions?limit=3&sortBy=date&sortDir=desc").then((r) =>
        r.json().then((d) => d.items)
      ),
    enabled: open,
    staleTime: 30_000,
  });

  const suggestedCatId = categoryOverride ?? aiSuggestion?.suggestion?.categoryId ?? null;
  const suggestedCat = categories?.find((c) => c.id === suggestedCatId && c.type === txType);
  const filteredCats = categories?.filter((c) => c.type === txType) ?? [];

  const canSave = parsed !== null && parsed.amount > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Autofocus
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setRaw("");
      setTypeOverride(null);
      setCategoryOverride(null);
      setDateOverride(null);
      setShowCategoryPicker(false);
      setShowDatePicker(false);
      setKeepOpen(false);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("Brak danych");
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed.amount,
          date: format(effectiveDate, "yyyy-MM-dd"),
          description: parsed.description || parsed.contractor || raw.trim(),
          contractor: parsed.contractor || null,
          type: txType,
          categoryId:
            suggestedCat?.id ??
            filteredCats[0]?.id ??
            categories?.[0]?.id,
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["widgets"] });
      qc.invalidateQueries({ queryKey: ["recent-txs"] });
      // Flash green then reset or close
      if (keepOpen) {
        setRaw("");
        setTypeOverride(null);
        setCategoryOverride(null);
        setDateOverride(null);
        setShowCategoryPicker(false);
        setShowDatePicker(false);
        setTimeout(() => inputRef.current?.focus(), 60);
      } else {
        setOpen(false);
      }
    },
    onError: () => toast.error("Nie udało się zapisać"),
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && canSave && !mutation.isPending) {
        setKeepOpen(e.metaKey || e.ctrlKey);
        mutation.mutate();
      }
    },
    [canSave, mutation]
  );

  // ── Trigger button ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Dodaj transakcję (⌘K)"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          padding: "9px 16px",
          background: "var(--text-1)",
          color: "var(--bg)",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          zIndex: 50,
          letterSpacing: "-0.01em",
        }}
      >
        + dodaj
      </button>
    );
  }

  // ── Panel ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 60,
        }}
      />

      {/* Command palette */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: "28%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(560px, calc(100vw - 32px))",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          zIndex: 70,
          overflow: "hidden",
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderBottom: `1px solid ${parsed ? "var(--border)" : "transparent"}`,
            gap: 12,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)", fontSize: 13 }}>
            &gt;
          </span>
          <input
            ref={inputRef}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="kwota, opis, kontrahent..."
            autoComplete="off"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-1)",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              padding: "16px 0",
              letterSpacing: "-0.01em",
            }}
          />
          {canSave && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-3)",
                flexShrink: 0,
              }}
            >
              ↵ zapisz
            </span>
          )}
        </div>

        {/* Preview */}
        {parsed && (
          <div style={{ padding: "14px 16px 12px" }}>
            {/* Interpretation line */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 20,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                  color: effectiveType === "income" ? "var(--green)" : "var(--red)",
                }}
              >
                {effectiveType === "income" ? "+" : "−"}{formatPLN(parsed.amount)}
              </span>
              <span style={{ color: "var(--text-2)", fontSize: 13 }}>
                {effectiveType === "income" ? "Przychód" : "Wydatek"}
              </span>
              {parsed.contractor && (
                <>
                  <span style={{ color: "var(--text-3)", fontSize: 13 }}>·</span>
                  <span style={{ color: "var(--text-1)", fontSize: 13 }}>{parsed.contractor}</span>
                </>
              )}
              <span style={{ color: "var(--text-3)", fontSize: 13 }}>·</span>
              <span style={{ color: "var(--text-2)", fontSize: 13 }}>
                {formatDateShort(effectiveDate)}
              </span>
              {suggestedCat && (
                <>
                  <span style={{ color: "var(--text-3)", fontSize: 13 }}>·</span>
                  <span
                    className="tag"
                    style={{ fontSize: 12, background: "var(--border)", color: "var(--text-1)" }}
                  >
                    {suggestedCat.emoji} {suggestedCat.name}
                  </span>
                  {aiSuggestion?.suggestion && !categoryOverride && (
                    <span style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                      {Math.round(aiSuggestion.suggestion.confidence * 100)}%
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Chip overrides */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Type toggle */}
              <button
                onClick={() =>
                  setTypeOverride(effectiveType === "income" ? "expense" : "income")
                }
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  padding: "3px 10px",
                  background: typeOverride ? "var(--border)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 2,
                  color: "var(--text-2)",
                  cursor: "pointer",
                }}
              >
                {effectiveType === "income" ? "→ wydatek" : "→ przychód"}
              </button>

              {/* Date picker */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowDatePicker((v) => !v);
                    setShowCategoryPicker(false);
                  }}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    padding: "3px 10px",
                    background: dateOverride ? "var(--border)" : "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 2,
                    color: "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  {dateOverride ? formatDateShort(new Date(dateOverride)) : "inna data"}
                </button>
                {showDatePicker && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 6px)",
                      left: 0,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: 8,
                      zIndex: 80,
                    }}
                  >
                    <input
                      type="date"
                      value={dateOverride ?? format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        setDateOverride(e.target.value);
                        setShowDatePicker(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-1)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Category picker */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowCategoryPicker((v) => !v);
                    setShowDatePicker(false);
                  }}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    padding: "3px 10px",
                    background: categoryOverride ? "var(--border)" : "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 2,
                    color: "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  {categoryOverride
                    ? categories?.find((c) => c.id === categoryOverride)?.name ?? "kategoria"
                    : "inna kategoria"}
                </button>
                {showCategoryPicker && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 6px)",
                      left: 0,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "4px 0",
                      zIndex: 80,
                      minWidth: 200,
                      maxHeight: 240,
                      overflowY: "auto",
                    }}
                  >
                    {filteredCats.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setCategoryOverride(cat.id);
                          setShowCategoryPicker(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          padding: "7px 14px",
                          background: categoryOverride === cat.id ? "var(--border)" : "transparent",
                          border: "none",
                          color: "var(--text-1)",
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "var(--border)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            categoryOverride === cat.id ? "var(--border)" : "transparent")
                        }
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent transactions when empty */}
        {!parsed && recentTxs && recentTxs.length > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "8px 0",
            }}
          >
            <div
              style={{
                padding: "4px 16px 6px",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Ostatnie
            </div>
            {recentTxs.map((tx) => (
              <button
                key={tx.id}
                onClick={() => {
                  const amt = tx.amount.toString();
                  const desc = tx.description;
                  setRaw(`${amt} ${desc}`);
                  setTimeout(() => inputRef.current?.focus(), 20);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "8px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "var(--border)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: tx.type === "INCOME" ? "var(--green)" : "var(--red)",
                    letterSpacing: "-0.02em",
                    minWidth: 90,
                    textAlign: "right",
                  }}
                >
                  {tx.type === "INCOME" ? "+" : "−"}
                  {formatPLN(tx.amount)}
                </span>
                <span style={{ color: "var(--text-2)", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.description}
                </span>
                <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {formatDateShort(new Date(tx.date))}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 16,
            justifyContent: "flex-end",
          }}
        >
          {[
            ["↵", "zapisz"],
            ["⌘↵", "zapisz + kolejna"],
            ["Esc", "zamknij"],
          ].map(([key, label]) => (
            <span
              key={key}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-3)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  padding: "1px 5px",
                  background: "var(--border)",
                  borderRadius: 2,
                  color: "var(--text-2)",
                }}
              >
                {key}
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
