"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button, Chip, Card, CardBody, Tooltip, Switch } from "@heroui/react";
import { KPICards } from "./KPICards";
import { CashflowChart } from "./CashflowChart";
import { TopCategoriesPie } from "./TopCategoriesPie";
import { AIAnalysis } from "./AIAnalysis";
import { formatCurrency } from "@/lib/formatters";
import { ChevronLeft, ChevronRight, Sparkles, Bell, AlertCircle, LayoutDashboard, BarChart3, Settings2, TrendingUp, TrendingDown, Calendar, CalendarDays } from "lucide-react";

interface DashboardData {
  kpi: { income: number; expense: number; profit: number; transactionCount: number };
  cashflow: { month: string; income: number; expense: number }[];
  topCategories: { name: string; color: string; emoji: string; total: number }[];
}

interface SettingsData {
  companyName: string;
  ollamaEnabled: boolean;
  budgetAlertEnabled: boolean;
  budgetAlertThreshold: number;
}

interface OverdueInvoice {
  id: string;
  number: string;
  amount: number;
  dueDate: string;
  contractor: { name: string };
}

// Widget definitions for Pro dashboard
const ALL_WIDGETS = [
  { id: "cashflow", label: "Wykres cashflow", icon: BarChart3, defaultOn: true },
  { id: "pie", label: "Top kategorie (kołowy)", icon: BarChart3, defaultOn: true },
  { id: "ai", label: "Analiza AI", icon: Sparkles, defaultOn: true },
  { id: "overdue", label: "Przeterminowane faktury", icon: AlertCircle, defaultOn: true },
];

function getGreeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Dzień dobry" : h < 18 ? "Cześć" : "Dobry wieczór";
  return `${prefix}, ${name} 👋`;
}

type YearMonthData = Record<string, { income: number; expense: number; profit: number }>;

export function DashboardClient() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = now.getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [mode, setMode] = useState<"simple" | "pro">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("dash-mode") as "simple" | "pro") ?? "simple";
    return "simple";
  });
  const [widgets, setWidgets] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dash-widgets");
      if (saved) return JSON.parse(saved);
    }
    return Object.fromEntries(ALL_WIDGETS.map((w) => [w.id, w.defaultOn]));
  });
  const [editingWidgets, setEditingWidgets] = useState(false);

  useEffect(() => { localStorage.setItem("dash-mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("dash-widgets", JSON.stringify(widgets)); }, [widgets]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", month],
    queryFn: () => fetch(`/api/dashboard?month=${month}`).then((r) => r.json()),
    enabled: viewMode === "month",
  });

  const { data: yearData, isLoading: yearLoading } = useQuery<YearMonthData>({
    queryKey: ["reports-monthly", selectedYear],
    queryFn: () => fetch(`/api/reports/monthly?year=${selectedYear}`).then((r) => r.json()),
    enabled: viewMode === "year",
  });

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const { data: overdueInvoices = [] } = useQuery<OverdueInvoice[]>({
    queryKey: ["overdue-invoices"],
    queryFn: async () => {
      const contractors = await fetch("/api/contractors").then((r) => r.json()) as Array<{ invoices?: Array<OverdueInvoice & { status: string }> }>;
      return contractors.flatMap((c) => (c.invoices ?? []).filter((i) => i.status === "overdue"));
    },
  });

  const [year, mon] = month.split("-");
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" })
    .format(new Date(Number(year), Number(mon) - 1, 1));

  const prevMonth = () => {
    const d = new Date(Number(year), Number(mon) - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(Number(year), Number(mon), 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const prevYear = () => setSelectedYear((y) => y - 1);
  const nextYear = () => setSelectedYear((y) => y + 1);

  const isCurrentMonth = month === currentMonth;
  const isCurrentYear = selectedYear === currentYear;

  // Aggregate year KPIs from monthly data
  const yearEntries = Object.entries(yearData ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const yearKpi = yearEntries.reduce(
    (acc, [, v]) => ({ income: acc.income + v.income, expense: acc.expense + v.expense, profit: acc.profit + v.profit, transactionCount: 0 }),
    { income: 0, expense: 0, profit: 0, transactionCount: 0 }
  );
  const yearCashflow = yearEntries.map(([m, v]) => ({ month: m, income: v.income, expense: v.expense }));

  const activeKpi = viewMode === "year" ? yearKpi : data?.kpi;
  const activeIsLoading = viewMode === "year" ? yearLoading : isLoading;

  const profit = activeKpi?.profit ?? 0;
  const companyName = settings?.companyName?.split(" ")[0] ?? "użytkowniku";

  // Shared period navigator used in both simple and pro
  const PeriodNav = () => (
    <div className="flex items-center gap-1">
      {/* View mode toggle */}
      <div className="flex items-center gap-0.5 bg-default-100 rounded-lg p-0.5 mr-1">
        <Tooltip content="Widok miesięczny">
          <button
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "month"
                ? "bg-white dark:bg-default-200 text-default-900 shadow-sm"
                : "text-default-500 hover:text-default-700"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Miesiąc
          </button>
        </Tooltip>
        <Tooltip content="Widok roczny">
          <button
            onClick={() => setViewMode("year")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "year"
                ? "bg-white dark:bg-default-200 text-default-900 shadow-sm"
                : "text-default-500 hover:text-default-700"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Rok
          </button>
        </Tooltip>
      </div>

      {/* Prev arrow */}
      <Button
        isIconOnly size="sm" variant="light"
        onPress={viewMode === "month" ? prevMonth : prevYear}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Current period label */}
      <span className="text-sm font-medium min-w-[130px] text-center capitalize">
        {viewMode === "month" ? monthLabel : selectedYear}
      </span>

      {/* Next arrow — disabled at current period */}
      <Button
        isIconOnly size="sm" variant="light"
        onPress={viewMode === "month" ? nextMonth : nextYear}
        isDisabled={viewMode === "month" ? isCurrentMonth : isCurrentYear}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // --- SIMPLE DASHBOARD ---
  if (mode === "simple") {
    return (
      <div className="space-y-5 max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting(companyName)}</h1>
            <p className="text-default-500 text-sm mt-1 capitalize">
              {viewMode === "month" ? monthLabel : selectedYear}
            </p>
          </div>
          <Tooltip content="Przełącz na dashboard profesjonalny">
            <Button
              size="sm" variant="flat" color="primary"
              startContent={<BarChart3 className="h-3.5 w-3.5" />}
              onPress={() => setMode("pro")}
            >
              Pro
            </Button>
          </Tooltip>
        </div>

        {/* Period nav */}
        <PeriodNav />

        {/* Welcome card */}
        <Card className="glass border-0 bg-gradient-to-br from-primary/10 to-violet-500/10" shadow="none">
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-default-400 uppercase tracking-wider mb-1">
                  {viewMode === "month" ? "Podsumowanie miesiąca" : `Podsumowanie ${selectedYear}`}
                </div>
                {activeIsLoading ? (
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-default-100 animate-pulse rounded" />
                    <div className="h-4 w-32 bg-default-100 animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <div className={`text-2xl font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}>
                      {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                    </div>
                    <div className="text-sm text-default-500 mt-1">
                      Przychody <span className="text-success font-medium">{formatCurrency(activeKpi?.income ?? 0)}</span>
                      {" · "}Wydatki <span className="text-danger font-medium">{formatCurrency(activeKpi?.expense ?? 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-xs text-default-500 font-medium uppercase tracking-wide">Przychody</span>
              </div>
              {activeIsLoading ? <div className="h-6 w-24 bg-default-100 animate-pulse rounded" /> : (
                <div className="text-xl font-bold text-success">{formatCurrency(activeKpi?.income ?? 0)}</div>
              )}
            </CardBody>
          </Card>
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-danger" />
                <span className="text-xs text-default-500 font-medium uppercase tracking-wide">Wydatki</span>
              </div>
              {activeIsLoading ? <div className="h-6 w-24 bg-default-100 animate-pulse rounded" /> : (
                <div className="text-xl font-bold text-danger">{formatCurrency(activeKpi?.expense ?? 0)}</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* AI / reminders */}
        {settings?.ollamaEnabled && <AIAnalysis month={month} compact />}

        {/* Overdue alert */}
        {overdueInvoices.length > 0 && (
          <Card className="glass border-0 ring-1 ring-warning/30 bg-warning/5" shadow="none">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 text-warning-700 dark:text-warning-400">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  {overdueInvoices.length} faktur(y) po terminie — przejdź do{" "}
                  <a href="/contractors" className="underline hover:no-underline">Kontrahentów</a>
                </span>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Top categories mini */}
        {data?.topCategories && data.topCategories.length > 0 && (
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-5">
              <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Top wydatki</div>
              <div className="space-y-2">
                {data.topCategories.slice(0, 3).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <span className="text-sm">{cat.emoji} {cat.name}</span>
                    <Chip size="sm" variant="flat" color="danger">{formatCurrency(cat.total)}</Chip>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  // --- PRO DASHBOARD ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard Pro</h1>
          <p className="text-default-500 text-sm mt-0.5 capitalize">
            {viewMode === "month" ? monthLabel : selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Widget editor toggle */}
          <Button
            size="sm" variant="flat"
            startContent={<Settings2 className="h-3.5 w-3.5" />}
            onPress={() => setEditingWidgets(!editingWidgets)}
          >
            {editingWidgets ? "Gotowe" : "Edytuj widżety"}
          </Button>
          {/* Period nav */}
          <PeriodNav />
          {/* Simple mode */}
          <Tooltip content="Przełącz na dashboard podstawowy">
            <Button size="sm" variant="light" startContent={<LayoutDashboard className="h-3.5 w-3.5" />} onPress={() => setMode("simple")}>
              Podstawowy
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Widget editor */}
      {editingWidgets && (
        <Card className="glass border-0 ring-1 ring-primary/20" shadow="none">
          <CardBody className="p-5">
            <div className="text-sm font-semibold mb-3">Wybierz widżety do wyświetlenia</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_WIDGETS.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-default-50 dark:bg-default-100/10">
                  <span className="text-xs font-medium">{w.label}</span>
                  <Switch
                    size="sm"
                    isSelected={widgets[w.id]}
                    onValueChange={(v) => setWidgets((prev) => ({ ...prev, [w.id]: v }))}
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* KPI Cards */}
      <KPICards kpi={activeKpi} isLoading={activeIsLoading} />

      {/* Overdue banner */}
      {overdueInvoices.length > 0 && (
        <Card className="glass border-0 ring-1 ring-danger/20 bg-danger/5" shadow="none">
          <CardBody className="p-4 flex flex-row items-center gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-danger">{overdueInvoices.length} faktur po terminie</span>
              {" — "}
              {overdueInvoices.slice(0, 2).map((inv) => (
                <span key={inv.id} className="text-default-500">{inv.contractor?.name} ({formatCurrency(inv.amount)}) </span>
              ))}
            </div>
            <Button as="a" href="/contractors" size="sm" color="danger" variant="flat">Zobacz</Button>
          </CardBody>
        </Card>
      )}

      {/* Charts row */}
      {(widgets.cashflow || widgets.pie) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {widgets.cashflow && (
            <div className="lg:col-span-2">
              <CashflowChart
                data={viewMode === "year" ? yearCashflow : data?.cashflow}
                isLoading={activeIsLoading}
              />
            </div>
          )}
          {widgets.pie && viewMode === "month" && (
            <div>
              <TopCategoriesPie data={data?.topCategories} isLoading={isLoading} />
            </div>
          )}
        </div>
      )}

      {/* AI Analysis */}
      {widgets.ai && settings?.ollamaEnabled && viewMode === "month" && <AIAnalysis month={month} />}
    </div>
  );
}
