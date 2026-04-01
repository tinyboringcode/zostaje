"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useEffect } from "react";
import CountUp from "react-countup";
import {
  ArrowLeftRight, Tag, Target, BarChart3, Settings, Download,
  Building2, Receipt, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from "lucide-react";
import { IntroScreen } from "@/components/onboarding/IntroScreen";

// ── Types ──────────────────────────────────────────────────────────────────

interface WidgetData {
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
  runway: number | null;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: { name: string; emoji: string };
}

type YearMonthData = Record<string, { income: number; expense: number; profit: number }>;

// ── Section tiles ──────────────────────────────────────────────────────────

const SECTIONS = [
  { href: "/transactions", icon: ArrowLeftRight, label: "Transakcje" },
  { href: "/contractors",  icon: Building2,      label: "Kontrahenci" },
  { href: "/import",       icon: Download,       label: "Import" },
  { href: "/reports",      icon: BarChart3,      label: "Raporty" },
  { href: "/podatki",      icon: Receipt,        label: "Podatki" },
  { href: "/budgets",      icon: Target,         label: "Budżety" },
  { href: "/categories",   icon: Tag,            label: "Kategorie" },
  { href: "/settings",     icon: Settings,       label: "Ustawienia" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTxDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  if (d.getFullYear() === now.getFullYear()) return `${dd}.${mm}`;
  return `${dd}.${mm}.${String(d.getFullYear()).slice(2)}`;
}

function AmountCountUp({ value, style }: { value: number; style?: React.CSSProperties }) {
  return (
    <span style={style}>
      <CountUp end={Math.abs(value)} duration={1.1} decimals={2} decimal="," separator=" " suffix=" zł" useEasing preserveValue />
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardHub() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  // Live clock
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Month navigation
  const realNow = new Date();
  const currentMonthKey = toMonthKey(realNow);
  const currentYear = realNow.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [selYear, selMon] = selectedMonth.split("-").map(Number);

  const prevMonth = () => {
    const d = new Date(selYear, selMon - 2, 1);
    setSelectedMonth(toMonthKey(d));
  };
  const nextMonth = () => {
    const d = new Date(selYear, selMon, 1);
    setSelectedMonth(toMonthKey(d));
  };
  const prevYear = () => setSelectedYear((y) => y - 1);
  const nextYear = () => setSelectedYear((y) => y + 1);

  const isCurrentMonth = selectedMonth === currentMonthKey;
  const isCurrentYear = selectedYear === currentYear;

  // Labels
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" })
    .format(new Date(selYear, selMon - 1, 1));

  const clockTime = tick.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const clockDate = tick.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // ── Data queries ────────────────────────────────────────────────────────

  const { data: wd } = useQuery<WidgetData>({
    queryKey: ["widgets", selectedMonth],
    queryFn: () => fetch(`/api/widgets?month=${selectedMonth}`).then((r) => r.json()),
    staleTime: 30_000,
    enabled: viewMode === "month",
  });

  const { data: yearData } = useQuery<YearMonthData>({
    queryKey: ["reports-monthly", selectedYear],
    queryFn: () => fetch(`/api/reports/monthly?year=${selectedYear}`).then((r) => r.json()),
    staleTime: 60_000,
    enabled: viewMode === "year",
  });

  const { data: txData } = useQuery<{ items: Transaction[] }>({
    queryKey: ["transactions", "recent"],
    queryFn: () => fetch("/api/transactions?limit=6&sortBy=date&sortDir=desc").then((r) => r.json()),
    staleTime: 30_000,
  });

  // ── Derived values ──────────────────────────────────────────────────────

  const yearEntries = Object.entries(yearData ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const yearTotals = yearEntries.reduce(
    (acc, [, v]) => ({ income: acc.income + v.income, expense: acc.expense + v.expense, profit: acc.profit + v.profit }),
    { income: 0, expense: 0, profit: 0 }
  );

  const income      = viewMode === "year" ? yearTotals.income  : (wd?.income ?? 0);
  const expense     = viewMode === "year" ? yearTotals.expense : (wd?.expense ?? 0);
  const profit      = viewMode === "year" ? yearTotals.profit  : (wd?.profit ?? 0);
  const netAfterTax = viewMode === "year" ? yearTotals.profit  : (wd?.netAfterTax ?? profit);
  const burden      = viewMode === "year" ? 0                  : (wd?.totalMonthlyBurden ?? 0);
  const daysToZus   = wd?.daysToZus ?? 99;
  const overdueCount   = wd?.overdueCount ?? 0;
  const overdueAmount  = wd?.overdueAmount ?? 0;
  const runway         = wd?.runway ?? null;
  const pendingCount   = wd?.pendingCount ?? 0;
  const pendingAmount  = wd?.pendingAmount ?? 0;
  const transactions   = txData?.items ?? [];

  const netColor = netAfterTax >= 0 ? "var(--green)" : "var(--red)";
  const hasAlert = viewMode === "month" && (overdueCount > 0 || daysToZus <= 5);

  // ── AdvancedCard ────────────────────────────────────────────────────────

  function AdvancedCard({ label, value, color = "var(--text-1)", sub }: {
    label: string; value: string; color?: string; sub?: string;
  }) {
    return (
      <div style={{ padding: "18px 20px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)" }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color, letterSpacing: "-0.02em", fontWeight: 400 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-sans)", marginTop: 5 }}>{sub}</div>}
      </div>
    );
  }

  // ── PeriodNav ───────────────────────────────────────────────────────────

  function PeriodNav() {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Month / Year toggle */}
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 3, marginRight: 6,
        }}>
          {(["month", "year"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                background: viewMode === m ? "var(--bg)" : "transparent",
                color: viewMode === m ? "var(--text-1)" : "var(--text-3)",
                boxShadow: viewMode === m ? "var(--shadow-sm)" : "none",
                transition: "all 120ms ease",
              }}
            >
              {m === "month" ? "Miesiąc" : "Rok"}
            </button>
          ))}
        </div>

        {/* Prev */}
        <button
          onClick={viewMode === "month" ? prevMonth : prevYear}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "var(--text-2)", display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Label */}
        <span style={{
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
          color: "var(--text-1)", minWidth: 130, textAlign: "center",
          textTransform: "capitalize", letterSpacing: "0.01em",
        }}>
          {viewMode === "month" ? monthLabel : selectedYear}
        </span>

        {/* Next — disabled at current period */}
        <button
          onClick={viewMode === "month" ? nextMonth : nextYear}
          disabled={viewMode === "month" ? isCurrentMonth : isCurrentYear}
          style={{
            background: "none", border: "none", cursor: (viewMode === "month" ? isCurrentMonth : isCurrentYear) ? "default" : "pointer",
            padding: "4px 6px", borderRadius: 6, color: (viewMode === "month" ? isCurrentMonth : isCurrentYear) ? "var(--text-3)" : "var(--text-2)",
            display: "flex", alignItems: "center", opacity: (viewMode === "month" ? isCurrentMonth : isCurrentYear) ? 0.35 : 1,
          }}
          onMouseEnter={(e) => {
            if (!(viewMode === "month" ? isCurrentMonth : isCurrentYear))
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          }}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <IntroScreen />

      <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 32 }}>

        {/* ── Header: date/time + period nav ─────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          {/* Live clock */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 400,
              letterSpacing: "-0.04em", color: "var(--text-1)", lineHeight: 1,
            }}>
              {clockTime}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-2)", textTransform: "capitalize", letterSpacing: "0.01em" }}>
              {clockDate}
            </span>
          </div>

          {/* Period navigation */}
          <PeriodNav />
        </div>

        {/* ── Main KPI ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(52px, 8vw, 76px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: netColor }}>
            {netAfterTax !== 0 && (netAfterTax > 0 ? "+" : "−")}
            <CountUp end={Math.abs(netAfterTax)} duration={1.2} decimals={2} decimal="," separator=" " suffix=" zł" useEasing preserveValue />
          </span>
          <span style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
            {viewMode === "month" ? "zostaje po podatkach i ZUS" : `suma za ${selectedYear}`}
          </span>
          {/* Breakdown */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
              <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 14 }}>
                +{income.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {" "}przychody
            </span>
            <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
              <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 14 }}>
                −{expense.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {" "}wydatki
            </span>
            {viewMode === "month" && burden > 0 && (
              <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
                <span style={{ color: "var(--amber)", fontFamily: "var(--font-mono)", fontSize: 14 }}>
                  −{burden.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                {" "}ZUS+PIT
              </span>
            )}
          </div>
        </div>

        {/* ── Metric cards ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Przychody",    value: income,      color: "var(--green)" },
            { label: "Wydatki",      value: expense,     color: "var(--red)" },
            { label: "Wynik brutto", value: profit,      color: profit >= 0 ? "var(--text-1)" : "var(--red)" },
            { label: viewMode === "month" ? "Pozostało" : "Zysk netto", value: netAfterTax, color: netAfterTax >= 0 ? "var(--text-1)" : "var(--red)" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{ padding: "18px 20px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)" }}
            >
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>
                {label}
              </div>
              <AmountCountUp value={value} style={{ fontFamily: "var(--font-mono)", fontSize: 19, color, letterSpacing: "-0.02em" }} />
            </div>
          ))}
        </div>

        {/* ── Year: monthly breakdown table ─────────────────────────────────── */}
        {viewMode === "year" && yearEntries.length > 0 && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Miesięczne zestawienie
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {yearEntries.map(([monthKey, v], i) => {
                const isLast = i === yearEntries.length - 1;
                const [, m] = monthKey.split("-").map(Number);
                const label = new Intl.DateTimeFormat("pl-PL", { month: "long" }).format(new Date(selectedYear, m - 1, 1));
                return (
                  <div
                    key={monthKey}
                    style={{
                      display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr",
                      gap: 12, alignItems: "center", minHeight: 40,
                      borderBottom: isLast ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-2)", textTransform: "capitalize" }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--green)" }}>
                      +{v.income.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--red)" }}>
                      −{v.expense.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: v.profit >= 0 ? "var(--text-1)" : "var(--red)" }}>
                      {v.profit >= 0 ? "+" : "−"}{Math.abs(v.profit).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Alert bar ────────────────────────────────────────────────────── */}
        {hasAlert && (
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "11px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-sans)", flexWrap: "wrap" }}>
            {overdueCount > 0 && (
              <Link href="/contractors" style={{ color: "var(--red)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--red)", display: "inline-block", flexShrink: 0 }} />
                {overdueCount} {overdueCount === 1 ? "faktura po terminie" : "faktury po terminie"}
                {overdueAmount > 0 && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    — {overdueAmount.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
                  </span>
                )}
              </Link>
            )}
            {daysToZus <= 5 && (
              <Link href="/podatki" style={{ color: "var(--amber)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--amber)", display: "inline-block", flexShrink: 0 }} />
                ZUS za {daysToZus} {daysToZus === 1 ? "dzień" : "dni"} — {burden.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
              </Link>
            )}
          </div>
        )}

        {/* ── Advanced widgets (toggle) — only in month view ────────────────── */}
        {viewMode === "month" && (
          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-3)", padding: "0 0 14px", letterSpacing: "0.02em" }}
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAdvanced ? "ukryj szczegóły" : "pokaż więcej wskaźników"}
            </button>

            {showAdvanced && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, animation: "fade-in 150ms ease both" }}>
                {runway !== null && (
                  <AdvancedCard
                    label="Runway"
                    value={`${runway} mies.`}
                    color={runway < 3 ? "var(--red)" : runway < 6 ? "var(--amber)" : "var(--text-1)"}
                    sub="przy obecnych kosztach"
                  />
                )}
                {pendingCount > 0 && (
                  <AdvancedCard
                    label="Faktury oczekujące"
                    value={`${pendingCount}`}
                    color="var(--text-1)"
                    sub={`${pendingAmount.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł`}
                  />
                )}
                <AdvancedCard
                  label="Następny ZUS"
                  value={`${daysToZus} dni`}
                  color={daysToZus <= 5 ? "var(--red)" : daysToZus <= 10 ? "var(--amber)" : "var(--text-1)"}
                  sub="do 20. miesiąca"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Recent transactions ───────────────────────────────────────────── */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Ostatnie transakcje
            </p>
          </div>
          <div>
          {transactions.map((tx, i) => {
            const isIncome = tx.type === "INCOME";
            const isLast = i === transactions.length - 1;
            return (
              <div
                key={tx.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "52px 1fr auto auto",
                  gap: 14,
                  alignItems: "center",
                  minHeight: 50,
                  padding: "0 20px",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>
                  {formatTxDate(tx.date)}
                </span>
                <span style={{ fontSize: 14, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.description}
                </span>
                <span className="tag">
                  {tx.category.emoji} {tx.category.name}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: isIncome ? "var(--green)" : "var(--red)", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {isIncome ? "+" : "−"}{Math.abs(tx.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                </span>
              </div>
            );
          })}
          </div>
          <div style={{ padding: "12px 20px", borderTop: transactions.length > 0 ? "none" : undefined }}>
            <Link
              href="/transactions"
              style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-2)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, transition: "color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
            >
              Wszystkie transakcje →
            </Link>
          </div>
        </div>

        {/* ── Section tiles ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {SECTIONS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: "22px 12px", border: "1px solid var(--border)", borderRadius: 12,
                background: "var(--bg)", textDecoration: "none",
                fontFamily: "var(--font-sans)",
                transition: "background 140ms ease, box-shadow 140ms ease, transform 140ms ease",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--surface)";
                el.style.boxShadow = "var(--shadow)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--bg)";
                el.style.boxShadow = "var(--shadow-sm)";
                el.style.transform = "translateY(0)";
              }}
            >
              <Icon size={26} style={{ color: "var(--text-2)" }} />
              <span style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 500 }}>{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}
