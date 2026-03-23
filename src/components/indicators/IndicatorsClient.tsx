"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Spinner } from "@heroui/react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import {
  TrendingUp, TrendingDown, Clock, AlertTriangle, Zap, Users,
  Calendar, Target, BarChart3, Activity, Flame, ShieldAlert,
} from "lucide-react";

interface Indicators {
  runway: number | null;
  burnRate: number;
  balance: number;
  avgIncomePerInvoice: number | null;
  mostExpensiveMonth: { month: string; expense: number } | null;
  daysToZus: number;
  nextZusDate: string;
  revenuePerClient: Array<{ id: string; name: string; companyType: string; revenue: number; totalInvoices: number }>;
  totalClientRevenue: number;
  trend: { slope: number; r2: number };
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  forecast: Array<{ month: string; projectedIncome: number; projectedExpense: number; projectedProfit: number }>;
  concentrationAlert: Array<{ name: string; revenue: number; percent: number }>;
  lowMonths: string[];
  breakEven: number;
  seasonality: Array<{ label: string; income: number; expense: number; count: number }>;
  months: Array<{ month: string; income: number; expense: number; profit: number }>;
  typeStats: Record<string, number>;
  currency: string;
}

function KPICard({
  title, value, sub, icon: Icon, color = "primary", alert = false,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  color?: "primary" | "success" | "danger" | "warning"; alert?: boolean;
}) {
  const colorMap = {
    primary: "from-primary/10 to-violet-500/5 text-primary",
    success: "from-success/10 to-emerald-500/5 text-success",
    danger: "from-danger/10 to-rose-500/5 text-danger",
    warning: "from-warning/10 to-amber-500/5 text-warning-600 dark:text-warning-400",
  };
  return (
    <Card className={`glass border-0 glow-hover bg-gradient-to-br ${colorMap[color]} ${alert ? "ring-1 ring-danger/30" : ""}`} shadow="none">
      <CardBody className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">{title}</div>
            <div className="text-2xl font-bold leading-tight truncate">{value}</div>
            {sub && <div className="text-xs text-default-500 mt-1">{sub}</div>}
          </div>
          <div className={`p-2 rounded-xl bg-current/10 shrink-0 ml-2`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

const monthFmt = (m: string) => {
  const [y, mo] = m.split("-");
  return new Intl.DateTimeFormat("pl-PL", { month: "short", year: "2-digit" })
    .format(new Date(Number(y), Number(mo) - 1, 1));
};

const glassTooltip = {
  contentStyle: {
    background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(100,116,235,0.15)", borderRadius: "12px", fontSize: 12,
  },
};

export function IndicatorsClient() {
  const { data, isLoading } = useQuery<Indicators>({
    queryKey: ["indicators"],
    queryFn: () => fetch("/api/indicators").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" color="primary" label="Obliczam wskaźniki..." />
      </div>
    );
  }

  const trendLabel =
    data.trend.slope > 100
      ? "📈 Szybki wzrost"
      : data.trend.slope > 0
      ? "📈 Wzrost"
      : data.trend.slope < -100
      ? "📉 Wyraźny spadek"
      : "➡️ Stabilnie";

  const forecastChartData = [
    ...data.months.slice(-3).map((m) => ({
      name: monthFmt(m.month),
      income: m.income,
      expense: m.expense,
      type: "actual" as const,
    })),
    ...data.forecast.map((f) => ({
      name: monthFmt(f.month) + " (P)",
      income: f.projectedIncome,
      expense: f.projectedExpense,
      type: "forecast" as const,
    })),
  ];

  return (
    <div className="space-y-8 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Wskaźniki finansowe</h1>
        <p className="text-default-500 text-sm mt-1">Analiza i prognozy oparte na historii transakcji</p>
      </div>

      {/* Alerts */}
      {(data.concentrationAlert.length > 0 || data.lowMonths.length > 0) && (
        <div className="space-y-2">
          {data.concentrationAlert.map((c) => (
            <Card key={c.name} className="glass border-0 ring-1 ring-danger/30 bg-danger/5" shadow="none">
              <CardBody className="p-4 flex flex-row items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-danger shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-danger">Ryzyko koncentracji</span>
                  {" — "}<span className="text-default-600">{c.name} stanowi {c.percent}% Twoich przychodów.</span>
                  <span className="text-default-400 ml-1">Utrata tego klienta mocno uderzy w cashflow.</span>
                </div>
              </CardBody>
            </Card>
          ))}
          {data.lowMonths.length > 0 && (
            <Card className="glass border-0 ring-1 ring-warning/30 bg-warning/5" shadow="none">
              <CardBody className="p-4 flex flex-row items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div className="text-sm text-default-700">
                  <span className="font-semibold">Sezonowe dołki</span> w: {data.lowMonths.join(", ")} — przychody poniżej 70% średniej.
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Basic KPIs */}
      <section>
        <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Podstawowe</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Runway"
            value={data.runway !== null ? `${data.runway.toFixed(1)} mies.` : "Brak danych"}
            sub={`Burn rate: ${formatCurrency(data.burnRate)}/mies.`}
            icon={Flame}
            color={data.runway !== null && data.runway < 2 ? "danger" : data.runway !== null && data.runway < 4 ? "warning" : "success"}
            alert={data.runway !== null && data.runway < 2}
          />
          <KPICard
            title="Śr. przychód / faktura"
            value={data.avgIncomePerInvoice !== null ? formatCurrency(data.avgIncomePerInvoice) : "Brak faktur"}
            sub="Na podstawie opłaconych faktur"
            icon={Zap}
            color="primary"
          />
          <KPICard
            title="Najdroższy miesiąc"
            value={data.mostExpensiveMonth ? monthFmt(data.mostExpensiveMonth.month) : "—"}
            sub={data.mostExpensiveMonth ? formatCurrency(data.mostExpensiveMonth.expense) + " wydatków" : "Brak historii"}
            icon={Calendar}
            color="warning"
          />
          <KPICard
            title="Do następnego ZUS"
            value={`${data.daysToZus} dni`}
            sub={`Termin: ${data.nextZusDate}`}
            icon={Clock}
            color={data.daysToZus <= 5 ? "danger" : data.daysToZus <= 10 ? "warning" : "primary"}
            alert={data.daysToZus <= 3}
          />
        </div>
      </section>

      {/* Intermediate */}
      <section>
        <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Średniozaawansowane</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KPICard
            title="Burn rate"
            value={formatCurrency(data.burnRate) + "/mies."}
            sub="Śr. z ostatnich 3 miesięcy"
            icon={Activity}
            color="warning"
          />
          <KPICard
            title="Trend przychodów"
            value={trendLabel}
            sub={`Nachylenie: ${data.trend.slope > 0 ? "+" : ""}${formatCurrency(data.trend.slope)}/mies.`}
            icon={data.trend.slope >= 0 ? TrendingUp : TrendingDown}
            color={data.trend.slope >= 0 ? "success" : "danger"}
          />
          <KPICard
            title="Śr. przychód/mies."
            value={formatCurrency(data.avgMonthlyIncome)}
            sub={`Wydatki: ${formatCurrency(data.avgMonthlyExpense)}/mies.`}
            icon={BarChart3}
            color="primary"
          />
          <KPICard
            title="Klientów z przychodem"
            value={String(data.revenuePerClient.length)}
            sub={data.revenuePerClient[0] ? `Top: ${data.revenuePerClient[0].name}` : "Brak faktur"}
            icon={Users}
            color="primary"
          />
        </div>

        {/* Revenue per client */}
        {data.revenuePerClient.length > 0 && (
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-5">
              <div className="font-semibold text-sm mb-4">Przychód na klienta</div>
              <div className="space-y-2.5">
                {data.revenuePerClient.slice(0, 8).map((c, idx) => {
                  const pct = data.totalClientRevenue > 0 ? (c.revenue / data.totalClientRevenue) * 100 : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate max-w-[60%]">
                          {idx + 1}. {c.name}
                        </span>
                        <span className="font-bold text-success">{formatCurrency(c.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-default-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-danger" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-8 text-right ${pct >= 70 ? "text-danger" : "text-default-400"}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </section>

      {/* Advanced */}
      <section>
        <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Zaawansowane</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KPICard
            title="Break-even / mies."
            value={formatCurrency(data.breakEven)}
            sub="Min. przychód by wyjść na zero"
            icon={Target}
            color={data.avgMonthlyIncome >= data.breakEven ? "success" : "danger"}
            alert={data.avgMonthlyIncome < data.breakEven}
          />
          <KPICard
            title="Prognoza (mies. +1)"
            value={data.forecast[0] ? formatCurrency(data.forecast[0].projectedProfit) : "—"}
            sub={data.forecast[0] ? `P: ${formatCurrency(data.forecast[0].projectedIncome)} | W: ${formatCurrency(data.forecast[0].projectedExpense)}` : ""}
            icon={TrendingUp}
            color={data.forecast[0]?.projectedProfit >= 0 ? "success" : "danger"}
          />
          <KPICard
            title="Koncentracja"
            value={data.concentrationAlert.length > 0 ? "⚠️ Ryzyko" : "✅ OK"}
            sub={data.concentrationAlert.length > 0 ? data.concentrationAlert[0].name + ": " + data.concentrationAlert[0].percent + "%" : "Dywersyfikacja w normie"}
            icon={ShieldAlert}
            color={data.concentrationAlert.length > 0 ? "danger" : "success"}
            alert={data.concentrationAlert.length > 0}
          />
          <KPICard
            title="Dołki sezonowe"
            value={data.lowMonths.length > 0 ? data.lowMonths.slice(0, 2).join(", ") : "Brak"}
            sub={data.lowMonths.length > 0 ? "Miesiące poniżej 70% śr." : "Przychody wyrównane"}
            icon={Calendar}
            color={data.lowMonths.length > 0 ? "warning" : "success"}
          />
        </div>

        {/* Forecast chart */}
        <Card className="glass border-0" shadow="none">
          <CardBody className="p-5">
            <div className="font-semibold text-sm mb-1">Prognoza cashflow — następne 3 miesiące</div>
            <div className="text-xs text-default-400 mb-4">Ostatnie 3 miesiące (dane) + 3 prognozowane (P)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={forecastChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
                <Tooltip {...glassTooltip} formatter={(v, n) => [formatCurrency(Number(v)), n === "income" ? "Przychody" : "Wydatki"]} />
                <Bar dataKey="income" fill="#22c55e" radius={[5, 5, 0, 0]} opacity={0.85} />
                <Bar dataKey="expense" fill="#ef4444" radius={[5, 5, 0, 0]} opacity={0.85} />
                <ReferenceLine x={forecastChartData[2]?.name} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "dziś", position: "top", fontSize: 10, fill: "#6366f1" }} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Seasonality */}
        <Card className="glass border-0 mt-4" shadow="none">
          <CardBody className="p-5">
            <div className="font-semibold text-sm mb-1">Sezonowość — przychody w ciągu roku</div>
            <div className="text-xs text-default-400 mb-4">Zagregowane dane historyczne wg miesiąca kalendarzowego</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.seasonality} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
                <Tooltip {...glassTooltip} formatter={(v) => [formatCurrency(Number(v)), ""]} />
                <Line dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Przychody" />
                <Line dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Wydatki" />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
