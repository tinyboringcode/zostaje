"use client";
import { useState, useEffect } from "react";
import { Card, CardBody, Button, Slider, Chip } from "@heroui/react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Sparkles, TrendingDown, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

const MONTHS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

interface SimParams {
  monthlyIncome: number;
  monthlyExpense: number;
  incomeGrowth: number; // % per month
  expenseGrowth: number;
  oneTimeExpense: number;
  oneTimeExpenseMonth: number;
  newClientMonth: number;
  newClientIncome: number;
}

function simulate(params: SimParams, months = 12) {
  const data = [];
  let balance = 0;
  let income = params.monthlyIncome;
  let expense = params.monthlyExpense;

  for (let i = 0; i < months; i++) {
    const extra = i === params.newClientMonth - 1 ? params.newClientIncome : 0;
    const oneTime = i === params.oneTimeExpenseMonth - 1 ? params.oneTimeExpense : 0;
    const monthIncome = income + extra;
    const monthExpense = expense + oneTime;
    const profit = monthIncome - monthExpense;
    balance += profit;

    data.push({
      month: MONTHS[i % 12],
      income: Math.round(monthIncome),
      expense: Math.round(monthExpense),
      profit: Math.round(profit),
      balance: Math.round(balance),
    });

    income *= 1 + params.incomeGrowth / 100;
    expense *= 1 + params.expenseGrowth / 100;
  }
  return data;
}

const SCENARIOS = [
  {
    name: "Stabilna JDG",
    icon: "⚖️",
    params: { monthlyIncome: 15000, monthlyExpense: 8000, incomeGrowth: 1, expenseGrowth: 0.5, oneTimeExpense: 0, oneTimeExpenseMonth: 6, newClientMonth: 99, newClientIncome: 0 },
  },
  {
    name: "Szybki wzrost",
    icon: "🚀",
    params: { monthlyIncome: 10000, monthlyExpense: 7000, incomeGrowth: 8, expenseGrowth: 3, oneTimeExpense: 0, oneTimeExpenseMonth: 6, newClientMonth: 3, newClientIncome: 8000 },
  },
  {
    name: "Ryzykowna sytuacja",
    icon: "⚠️",
    params: { monthlyIncome: 12000, monthlyExpense: 11500, incomeGrowth: -2, expenseGrowth: 2, oneTimeExpense: 15000, oneTimeExpenseMonth: 4, newClientMonth: 99, newClientIncome: 0 },
  },
  {
    name: "Sezonowość",
    icon: "🌊",
    params: { monthlyIncome: 20000, monthlyExpense: 9000, incomeGrowth: 0, expenseGrowth: 0.3, oneTimeExpense: 5000, oneTimeExpenseMonth: 1, newClientMonth: 7, newClientIncome: 5000 },
  },
];

const AI_MESSAGES = [
  "Analizuję Twoją sytuację finansową...",
  "Sprawdzam trendy przychodów...",
  "Oceniam ryzyko cashflow...",
  "Przygotowuję rekomendacje...",
];

function generateInsights(data: ReturnType<typeof simulate>, params: SimParams) {
  const insights: Array<{ type: "success" | "warning" | "danger" | "info"; text: string }> = [];

  const lastBalance = data[data.length - 1].balance;
  const avgProfit = data.reduce((s, d) => s + d.profit, 0) / data.length;
  const negativeMonths = data.filter((d) => d.profit < 0).length;
  const runway = avgProfit < 0 ? 0 : lastBalance / Math.max(1, params.monthlyExpense);

  if (lastBalance > 0 && negativeMonths === 0) {
    insights.push({ type: "success", text: `Doskonały cashflow! Po 12 miesiącach saldo wyniesie ${fmt(lastBalance)}.` });
  } else if (lastBalance < 0) {
    insights.push({ type: "danger", text: `Uwaga: przy obecnym tempie po 12 miesiącach saldo będzie ujemne (${fmt(lastBalance)}). Konieczne działania naprawcze.` });
  }

  if (negativeMonths >= 3) {
    insights.push({ type: "warning", text: `${negativeMonths} miesięcy z ujemnym wynikiem. Rozważ redukcję kosztów stałych lub zwiększenie przychodów.` });
  }

  if (params.incomeGrowth > 5) {
    insights.push({ type: "success", text: `Wzrost przychodów ${params.incomeGrowth}%/mies. to świetny wynik — przy takim tempie podwoisz przychody w ok. ${Math.round(70 / params.incomeGrowth)} miesiącach.` });
  } else if (params.incomeGrowth < -1) {
    insights.push({ type: "danger", text: "Przychody maleją! Czas zidentyfikować przyczynę i podjąć kroki w celu pozyskania nowych klientów." });
  }

  if (params.oneTimeExpense > params.monthlyIncome * 0.5) {
    insights.push({ type: "warning", text: `Planowany jednorazowy wydatek ${fmt(params.oneTimeExpense)} to ponad 50% miesięcznego przychodu — upewnij się, że masz odpowiedni bufor.` });
  }

  if (params.monthlyExpense / params.monthlyIncome > 0.85) {
    insights.push({ type: "warning", text: `Marża zysku poniżej 15% — koszty stanowią ${Math.round((params.monthlyExpense / params.monthlyIncome) * 100)}% przychodów. Warto przejrzeć stałe koszty.` });
  } else if (params.monthlyExpense / params.monthlyIncome < 0.5) {
    insights.push({ type: "success", text: `Świetna marża! Koszty to tylko ${Math.round((params.monthlyExpense / params.monthlyIncome) * 100)}% przychodów.` });
  }

  if (runway < 2 && runway > 0) {
    insights.push({ type: "danger", text: `Runway tylko ${runway.toFixed(1)} miesiąca. Priorytetem powinno być zwiększenie przychodów lub cięcie kosztów.` });
  } else if (runway > 6) {
    insights.push({ type: "success", text: `Runway ${runway.toFixed(0)} miesięcy daje Ci komfortowy bufor bezpieczeństwa.` });
  }

  if (params.newClientMonth <= 12 && params.newClientIncome > 0) {
    const bonus = params.newClientIncome * (12 - params.newClientMonth + 1);
    insights.push({ type: "info", text: `Nowy klient w miesiącu ${params.newClientMonth} przyniesie dodatkowe ~${fmt(bonus)} do końca roku.` });
  }

  return insights;
}

const glassTooltip = {
  contentStyle: { background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(100,116,235,0.15)", borderRadius: "12px", fontSize: 12 },
};

export function AIDemoClient() {
  const [params, setParams] = useState<SimParams>(SCENARIOS[0].params);
  const [activeScenario, setActiveScenario] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState("");
  const [showInsights, setShowInsights] = useState(false);

  const data = simulate(params);
  const insights = generateInsights(data, params);

  const triggerAI = () => {
    setIsThinking(true);
    setShowInsights(false);
    let i = 0;
    const interval = setInterval(() => {
      setThinkingText(AI_MESSAGES[i % AI_MESSAGES.length]);
      i++;
      if (i >= AI_MESSAGES.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsThinking(false);
          setShowInsights(true);
        }, 600);
      }
    }, 700);
  };

  useEffect(() => {
    setShowInsights(false);
  }, [params]);

  const set = (key: keyof SimParams, val: number) => setParams((p) => ({ ...p, [key]: val }));

  const totalBalance = data[data.length - 1].balance;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Demo AI — Symulacja finansowa</h1>
          <p className="text-default-500 text-sm mt-1">Sprawdź co się stanie z Twoim cashflow w różnych scenariuszach</p>
        </div>
        <Chip
          startContent={<Sparkles className="h-3.5 w-3.5" />}
          color="secondary" variant="flat"
          className="text-xs"
        >
          Symulacja AI — bez danych rzeczywistych
        </Chip>
      </div>

      {/* Scenario selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SCENARIOS.map((s, i) => (
          <button
            key={i}
            onClick={() => { setParams(s.params); setActiveScenario(i); setShowInsights(false); }}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              activeScenario === i
                ? "border-primary bg-primary/8 shadow-md shadow-primary/15"
                : "border-default-200 hover:border-default-300 hover:bg-default-50"
            }`}
          >
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xs font-semibold">{s.name}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="glass border-0 lg:col-span-1" shadow="none">
          <CardBody className="p-5 space-y-5">
            <div className="font-semibold text-sm">Parametry symulacji</div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-default-500">
                <span>Miesięczny przychód</span>
                <span className="font-semibold text-foreground">{fmt(params.monthlyIncome)}</span>
              </div>
              <Slider
                size="sm" color="success"
                minValue={1000} maxValue={100000} step={500}
                value={params.monthlyIncome}
                onChange={(v) => set("monthlyIncome", Number(v))}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-default-500">
                <span>Miesięczne koszty</span>
                <span className="font-semibold text-foreground">{fmt(params.monthlyExpense)}</span>
              </div>
              <Slider
                size="sm" color="danger"
                minValue={500} maxValue={80000} step={500}
                value={params.monthlyExpense}
                onChange={(v) => set("monthlyExpense", Number(v))}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-default-500">
                <span>Wzrost przychodów / mies.</span>
                <span className={`font-semibold ${params.incomeGrowth >= 0 ? "text-success" : "text-danger"}`}>
                  {params.incomeGrowth > 0 ? "+" : ""}{params.incomeGrowth}%
                </span>
              </div>
              <Slider
                size="sm" color="primary"
                minValue={-10} maxValue={20} step={0.5}
                value={params.incomeGrowth}
                onChange={(v) => set("incomeGrowth", Number(v))}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-default-500">
                <span>Wzrost kosztów / mies.</span>
                <span className={`font-semibold ${params.expenseGrowth <= 0 ? "text-success" : "text-warning-600"}`}>
                  {params.expenseGrowth > 0 ? "+" : ""}{params.expenseGrowth}%
                </span>
              </div>
              <Slider
                size="sm" color="warning"
                minValue={-5} maxValue={10} step={0.5}
                value={params.expenseGrowth}
                onChange={(v) => set("expenseGrowth", Number(v))}
              />
            </div>

            <div className="border-t border-default-100 pt-3 space-y-3">
              <div className="text-xs text-default-400 font-semibold uppercase tracking-wide">Zdarzenia jednorazowe</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-default-500">
                  <span>Duży wydatek jednorazowy</span>
                  <span className="font-semibold text-foreground">{fmt(params.oneTimeExpense)}</span>
                </div>
                <Slider size="sm" color="danger" minValue={0} maxValue={50000} step={1000}
                  value={params.oneTimeExpense} onChange={(v) => set("oneTimeExpense", Number(v))} />
                <div className="flex justify-between text-xs text-default-500 mt-1">
                  <span>W miesiącu</span>
                  <span className="font-semibold">{MONTHS[params.oneTimeExpenseMonth - 1]}</span>
                </div>
                <Slider size="sm" minValue={1} maxValue={12} step={1}
                  value={params.oneTimeExpenseMonth} onChange={(v) => set("oneTimeExpenseMonth", Number(v))} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-default-500">
                  <span>Nowy klient w mies.</span>
                  <span className="font-semibold">{params.newClientMonth <= 12 ? MONTHS[params.newClientMonth - 1] : "—"}</span>
                </div>
                <Slider size="sm" color="success" minValue={1} maxValue={13} step={1}
                  value={params.newClientMonth} onChange={(v) => set("newClientMonth", Number(v))} />
                {params.newClientMonth <= 12 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-default-500">
                      <span>Przychód od nowego klienta</span>
                      <span className="font-semibold text-success">{fmt(params.newClientIncome)}</span>
                    </div>
                    <Slider size="sm" color="success" minValue={0} maxValue={30000} step={500}
                      value={params.newClientIncome} onChange={(v) => set("newClientIncome", Number(v))} />
                  </div>
                )}
              </div>
            </div>

            <Button
              color="secondary" variant="flat" size="sm" fullWidth
              startContent={<Sparkles className="h-4 w-4" />}
              isLoading={isThinking}
              onPress={triggerAI}
            >
              {isThinking ? thinkingText : "Analizuj z AI"}
            </Button>
          </CardBody>
        </Card>

        {/* Charts + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Przychody roczne", value: fmt(data.reduce((s, d) => s + d.income, 0)), color: "text-success" },
              { label: "Koszty roczne",    value: fmt(data.reduce((s, d) => s + d.expense, 0)), color: "text-danger" },
              { label: "Saldo po 12 mies.", value: fmt(totalBalance), color: totalBalance >= 0 ? "text-success" : "text-danger" },
            ].map((kpi) => (
              <Card key={kpi.label} className="glass border-0" shadow="none">
                <CardBody className="p-4">
                  <div className="text-xs text-default-400 mb-1">{kpi.label}</div>
                  <div className={`font-bold text-lg ${kpi.color}`}>{kpi.value}</div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-5">
              <div className="font-semibold text-sm mb-1">Prognoza 12-miesięczna</div>
              <div className="flex items-center gap-4 mb-4 text-xs text-default-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />Przychody</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />Koszty</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Saldo</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
                  <Tooltip {...glassTooltip} formatter={(v) => [fmt(Number(v)), ""]} />
                  <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#gIncome)" name="Przychody" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" name="Koszty" />
                  <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fill="url(#gBalance)" name="Saldo" />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* AI Insights */}
          {showInsights && insights.length > 0 && (
            <div className="space-y-2 animate-slide-up">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold">Analiza AI</span>
              </div>
              {insights.map((ins, i) => {
                const iconMap = {
                  success: <CheckCircle2 className="h-4 w-4 text-success shrink-0" />,
                  warning: <AlertTriangle className="h-4 w-4 text-warning shrink-0" />,
                  danger: <TrendingDown className="h-4 w-4 text-danger shrink-0" />,
                  info: <Zap className="h-4 w-4 text-primary shrink-0" />,
                };
                const bgMap = {
                  success: "bg-success/5 ring-success/20",
                  warning: "bg-warning/5 ring-warning/20",
                  danger: "bg-danger/5 ring-danger/20",
                  info: "bg-primary/5 ring-primary/20",
                };
                return (
                  <Card key={i} className={`glass border-0 ring-1 ${bgMap[ins.type]}`} shadow="none">
                    <CardBody className="p-4 flex flex-row items-start gap-3">
                      {iconMap[ins.type]}
                      <p className="text-sm">{ins.text}</p>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {!showInsights && (
            <Card className="glass border-0 bg-gradient-to-br from-violet-500/5 to-primary/3" shadow="none">
              <CardBody className="p-4 flex flex-row items-center gap-3">
                <Sparkles className="h-5 w-5 text-violet-400 shrink-0" />
                <p className="text-sm text-default-500">
                  Dostosuj parametry powyżej i kliknij <strong>Analizuj z AI</strong>, aby otrzymać szczegółowe rekomendacje finansowe.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Month table */}
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-default-100">
                    {["Miesiąc", "Przychód", "Koszt", "Wynik", "Saldo"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-default-400 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-default-50 hover:bg-default-50/40">
                      <td className="px-4 py-2 font-medium">{row.month}</td>
                      <td className="px-4 py-2 text-success font-semibold">{fmt(row.income)}</td>
                      <td className="px-4 py-2 text-danger">{fmt(row.expense)}</td>
                      <td className={`px-4 py-2 font-bold ${row.profit >= 0 ? "text-success" : "text-danger"}`}>
                        {row.profit >= 0 ? "+" : ""}{fmt(row.profit)}
                      </td>
                      <td className={`px-4 py-2 font-semibold ${row.balance >= 0 ? "text-default-700" : "text-danger"}`}>
                        {fmt(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
