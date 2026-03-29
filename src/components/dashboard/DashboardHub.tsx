"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import CountUp from "react-countup";
import {
  ArrowLeftRight, Tag, Target, BarChart3, Settings, Download,
  Building2, Receipt, ChevronDown, ChevronUp,
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

function formatTxDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  if (d.getFullYear() === now.getFullYear()) return `${dd}.${mm}`;
  return `${dd}.${mm}.${String(d.getFullYear()).slice(2)}`;
}

function AmountCountUp({ value, className, style }: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className} style={style}>
      <CountUp
        end={Math.abs(value)}
        duration={1.1}
        decimals={2}
        decimal=","
        separator=" "
        suffix=" zł"
        useEasing
        preserveValue
      />
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardHub() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(now);

  const { data: wd } = useQuery<WidgetData>({
    queryKey: ["widgets"],
    queryFn: () => fetch("/api/widgets").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: txData } = useQuery<{ items: Transaction[] }>({
    queryKey: ["transactions", "recent"],
    queryFn: () =>
      fetch("/api/transactions?limit=6&sortBy=date&sortDir=desc").then((r) => r.json()),
    staleTime: 30_000,
  });

  const profit = wd?.profit ?? 0;
  const netAfterTax = wd?.netAfterTax ?? profit;
  const income = wd?.income ?? 0;
  const expense = wd?.expense ?? 0;
  const burden = wd?.totalMonthlyBurden ?? 0;
  const daysToZus = wd?.daysToZus ?? 99;
  const overdueCount = wd?.overdueCount ?? 0;
  const overdueAmount = wd?.overdueAmount ?? 0;
  const runway = wd?.runway ?? null;
  const pendingCount = wd?.pendingCount ?? 0;
  const pendingAmount = wd?.pendingAmount ?? 0;
  const transactions = txData?.items ?? [];

  const netColor = netAfterTax >= 0 ? "var(--green)" : "var(--red)";
  const hasAlert = overdueCount > 0 || daysToZus <= 5;

  // ── Advanced widget card ─────────────────────────────────────────────────

  function AdvancedCard({ label, value, color = "var(--text-1)", sub }: {
    label: string; value: string; color?: string; sub?: string;
  }) {
    return (
      <div style={{ padding: "16px 18px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 500 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, color, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-sans)", marginTop: 4 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <>
      <IntroScreen />

      <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 36 }}>

        {/* ── Month ────────────────────────────────────────────────────────── */}
        <p style={{ margin: 0, fontSize: 14, fontFamily: "var(--font-sans)", color: "var(--text-3)", textTransform: "capitalize", letterSpacing: "0.02em" }}>
          {monthLabel}
        </p>

        {/* ── Main KPI ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(52px, 8vw, 76px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: netColor }}>
            {netAfterTax !== 0 && (netAfterTax > 0 ? "+" : "−")}
            <CountUp
              end={Math.abs(netAfterTax)}
              duration={1.2}
              decimals={2}
              decimal=","
              separator=" "
              suffix=" zł"
              useEasing
              preserveValue
            />
          </span>
          <span style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
            zostaje po podatkach i ZUS
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
            <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-3)" }}>
              <span style={{ color: "var(--amber)", fontFamily: "var(--font-mono)", fontSize: 14 }}>
                −{burden.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {" "}ZUS+PIT
            </span>
          </div>
        </div>

        {/* ── Metric cards ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { label: "Przychody",    value: income,      color: "var(--green)" },
            { label: "Wydatki",      value: expense,     color: "var(--red)" },
            { label: "Wynik brutto", value: profit,      color: profit >= 0 ? "var(--text-1)" : "var(--red)" },
            { label: "Pozostało",    value: netAfterTax, color: netAfterTax >= 0 ? "var(--text-1)" : "var(--red)" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                padding: "16px 18px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, fontWeight: 500 }}>
                {label}
              </div>
              <AmountCountUp
                value={value}
                style={{ fontFamily: "var(--font-mono)", fontSize: 18, color, letterSpacing: "-0.02em" }}
              />
            </div>
          ))}
        </div>

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

        {/* ── Advanced widgets (toggle) ─────────────────────────────────────── */}
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

        {/* ── Recent transactions ───────────────────────────────────────────── */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ostatnie transakcje
          </p>
          {transactions.map((tx, i) => {
            const isIncome = tx.type === "INCOME";
            const isLast = i === transactions.length - 1;
            return (
              <div
                key={tx.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  minHeight: 48,
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                }}
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
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: isIncome ? "var(--green)" : "var(--red)", whiteSpace: "nowrap" }}>
                  {isIncome ? "+" : "−"}{Math.abs(tx.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                </span>
              </div>
            );
          })}
          <div style={{ paddingTop: 12 }}>
            <Link
              href="/transactions"
              style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-2)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, transition: "color 150ms" }}
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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "20px 12px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--bg)",
                textDecoration: "none",
                color: "var(--text-2)",
                fontFamily: "var(--font-sans)",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg)";
              }}
            >
              <Icon size={28} style={{ color: "var(--text-3)" }} />
              <span style={{ color: "var(--text-1)", fontSize: 14 }}>{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}
