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

// Count-up for PLN amounts
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

  // ── Metric cell ──────────────────────────────────────────────────────────

  function Metric({ label, value, color }: { label: string; value: number; color: string }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <AmountCountUp
          value={value}
          style={{ fontFamily: "var(--font-mono)", fontSize: 16, color, letterSpacing: "-0.02em" }}
        />
      </div>
    );
  }

  // ── Advanced widget card ─────────────────────────────────────────────────

  function AdvancedCard({ label, value, color = "var(--text-1)", sub }: {
    label: string; value: string; color?: string; sub?: string;
  }) {
    return (
      <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", marginTop: 2 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <>
      <IntroScreen />

      <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 32 }}>

        {/* ── Month ────────────────────────────────────────────────────────── */}
        <p style={{ margin: 0, fontSize: 12, fontFamily: "var(--font-sans)", color: "var(--text-3)", textTransform: "capitalize", letterSpacing: "0.02em" }}>
          {monthLabel}
        </p>

        {/* ── Main KPI ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: netColor }}>
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
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
            zostaje po podatkach i ZUS
          </span>
          {/* Breakdown */}
          <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "var(--font-sans)", color: "var(--text-3)", flexWrap: "wrap", marginTop: 2 }}>
            <span>
              <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                +{income.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {" "}przychody
            </span>
            <span>
              <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                −{expense.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {" "}wydatki
            </span>
            <span>
              <span style={{ color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                −{burden.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {" "}ZUS+PIT
            </span>
          </div>
        </div>

        {/* ── Secondary metrics ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, paddingTop: 4 }}>
          <Metric label="Przychody" value={income} color="var(--green)" />
          <Metric label="Wydatki" value={expense} color="var(--red)" />
          <Metric label="Wynik brutto" value={profit} color={profit >= 0 ? "var(--text-1)" : "var(--red)"} />
        </div>

        {/* ── Alert bar ────────────────────────────────────────────────────── */}
        {hasAlert && (
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, fontFamily: "var(--font-sans)", flexWrap: "wrap" }}>
            {overdueCount > 0 && (
              <Link href="/contractors" style={{ color: "var(--red)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--red)", display: "inline-block", flexShrink: 0 }} />
                {overdueCount} {overdueCount === 1 ? "faktura po terminie" : "faktury po terminie"}
                {overdueAmount > 0 && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
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
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-3)", padding: "0 0 12px", letterSpacing: "0.02em" }}
          >
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ostatnie transakcje
          </p>
          {transactions.map((tx, i) => {
            const isIncome = tx.type === "INCOME";
            const isLast = i === transactions.length - 1;
            return (
              <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
                  {formatTxDate(tx.date)}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.description}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: isIncome ? "var(--green)" : "var(--red)", whiteSpace: "nowrap" }}>
                  {isIncome ? "+" : "−"}{Math.abs(tx.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                </span>
              </div>
            );
          })}
          <div style={{ paddingTop: 10 }}>
            <Link href="/transactions" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>
              → wszystkie
            </Link>
          </div>
        </div>

        {/* ── Section tiles ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {SECTIONS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 8px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", textDecoration: "none", color: "var(--text-2)", fontSize: 12, fontFamily: "var(--font-sans)", transition: "background 120ms, border-color 120ms" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--surface)";
                el.style.borderColor = "var(--text-3)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--bg)";
                el.style.borderColor = "var(--border)";
              }}
            >
              <Icon size={15} style={{ color: "var(--text-3)" }} />
              <span style={{ color: "var(--text-1)" }}>{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}
