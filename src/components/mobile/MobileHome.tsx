"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import CountUp from "react-countup";

interface WidgetsData {
  income: number;
  expense: number;
  profit: number;
  netAfterTax: number;
  totalMonthlyBurden: number;
  daysToZus: number;
  overdueCount: number;
  overdueAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: { name: string; emoji: string };
}

// ── Swipe gesture hook ────────────────────────────────────────────────────

function useSwipe(onSwipeRight: () => void) {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy) && dx > 80) {
      onSwipeRight();
    }
  }, [onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}

// ── Swipe transaction row ────────────────────────────────────────────────

function SwipeTxRow({ tx }: { tx: Transaction }) {
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);

  const isIncome = tx.type === "INCOME";

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return "dziś";
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -80));
  };

  const handleTouchEnd = () => {
    if (offset < -50) {
      setOffset(-80);
      setSwiped(true);
    } else {
      setOffset(0);
      setSwiped(false);
    }
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Quick action revealed on swipe */}
      {swiped && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)" }}>
          <Link
            href={`/transactions`}
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-2)", textDecoration: "none", textAlign: "center", lineHeight: 1.3 }}
          >
            edytuj
          </Link>
        </div>
      )}

      {/* Row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 || offset === -80 ? "transform 150ms" : "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 0",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", flexShrink: 0, width: 32 }}>
          {formatDate(tx.date)}
        </span>
        <span style={{ flex: 1, fontSize: 14, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tx.description}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: isIncome ? "var(--green)" : "var(--red)", flexShrink: 0, letterSpacing: "-0.02em" }}>
          {isIncome ? "+" : "−"}{Math.abs(tx.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
        </span>
      </div>
    </div>
  );
}

// ── Camera scan overlay ───────────────────────────────────────────────────

function ScanOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
          📷
        </div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-2)" }}>Zeskanuj paragon / fakturę</span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-3)" }}>AI odczyta kwotę automatycznie</span>
        <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} />
      </label>
      <button onClick={onClose} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "8px 0", marginTop: 16 }}>
        zamknij ↑
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function MobileHome() {
  const [scanOpen, setScanOpen] = useState(false);

  const { data: widgets, isLoading } = useQuery<WidgetsData>({
    queryKey: ["widgets"],
    queryFn: () => fetch("/api/widgets").then((r) => r.json()),
  });

  const { data: txData } = useQuery<{ items: Transaction[] }>({
    queryKey: ["transactions", { limit: 5 }],
    queryFn: () => fetch("/api/transactions?limit=5&sortBy=date&sortDir=desc").then((r) => r.json()),
  });

  const profit = widgets?.profit ?? 0;
  const netAfterTax = widgets?.netAfterTax ?? profit;
  const income = widgets?.income ?? 0;
  const expense = widgets?.expense ?? 0;
  const burden = widgets?.totalMonthlyBurden ?? 0;
  const daysToZus = widgets?.daysToZus ?? 99;
  const overdueCount = widgets?.overdueCount ?? 0;
  const overdueAmount = widgets?.overdueAmount ?? 0;
  const transactions = txData?.items ?? [];

  const swipe = useSwipe(() => setScanOpen(true));

  const now = new Date();
  const monthLabel = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  if (scanOpen) return <ScanOverlay onClose={() => setScanOpen(false)} />;

  return (
    <div
      {...swipe}
      style={{ padding: "24px 20px", minHeight: "100dvh", background: "var(--bg)", userSelect: "none" }}
    >
      {/* Swipe hint */}
      <div style={{ position: "fixed", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 40, background: "var(--border)", borderRadius: "0 2px 2px 0", opacity: 0.6 }} />

      {/* Month */}
      <p style={{ margin: "0 0 24px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {monthLabel}
      </p>

      {/* ── Main widget card ─────────────────────────────────────────────── */}
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 20px 18px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          zostaje
        </p>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: netAfterTax >= 0 ? "var(--green)" : "var(--red)", marginBottom: 4 }}>
          {isLoading ? (
            <span style={{ color: "var(--text-3)" }}>—</span>
          ) : (
            <>
              {netAfterTax !== 0 && (netAfterTax > 0 ? "+" : "−")}
              <CountUp end={Math.abs(netAfterTax)} duration={1.1} decimals={2} decimal="," separator=" " suffix=" zł" useEasing preserveValue />
            </>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
          po ZUS i podatku
        </p>
        {overdueCount > 0 && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--red)", fontFamily: "var(--font-sans)" }}>
            {overdueCount} {overdueCount === 1 ? "faktura po terminie" : "faktury po terminie"}
            {overdueAmount > 0 ? ` — ${overdueAmount.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł` : ""}
          </p>
        )}
      </div>

      {/* ── 2-col widget row ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {/* Przychody */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Przychody</p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--green)", letterSpacing: "-0.02em" }}>
            {isLoading ? "—" : (
              <CountUp end={income} duration={1.0} decimals={2} decimal="," separator=" " suffix=" zł" useEasing preserveValue />
            )}
          </div>
        </div>

        {/* Wydatki */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Wydatki</p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--red)", letterSpacing: "-0.02em" }}>
            {isLoading ? "—" : (
              <CountUp end={expense} duration={1.0} decimals={2} decimal="," separator=" " suffix=" zł" useEasing preserveValue />
            )}
          </div>
        </div>
      </div>

      {/* ── ZUS widget (full-width, only if alert) ───────────────────────── */}
      {(overdueCount > 0 || daysToZus <= 10) && (
        <Link
          href="/m/podatki"
          style={{ display: "block", background: "var(--bg)", border: `1px solid ${daysToZus <= 5 ? "var(--red)" : "var(--amber)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", textDecoration: "none" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Następny ZUS</p>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: daysToZus <= 5 ? "var(--red)" : "var(--amber)", letterSpacing: "-0.02em" }}>
                za {daysToZus} dni
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--text-1)" }}>
                {burden.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>do 20. miesiąca</p>
            </div>
          </div>
        </Link>
      )}

      {/* ── Recent transactions ──────────────────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Ostatnie</p>
          <Link href="/m/transactions" style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textDecoration: "none" }}>
            wszystkie →
          </Link>
        </div>
        {transactions.map((tx) => (
          <SwipeTxRow key={tx.id} tx={tx} />
        ))}
        {transactions.length === 0 && !isLoading && (
          <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-sans)", padding: "16px 0" }}>
            Brak transakcji — <Link href="/m/add" style={{ color: "var(--text-2)" }}>dodaj pierwszą</Link>
          </p>
        )}
      </div>

      {/* ── Swipe hint text ──────────────────────────────────────────────── */}
      <p style={{ margin: "24px 0 0", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textAlign: "center" }}>
        ← przesuń w prawo aby zeskanować paragon
      </p>
    </div>
  );
}
