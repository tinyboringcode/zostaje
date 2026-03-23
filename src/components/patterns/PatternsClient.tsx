"use client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface Pattern {
  categoryId: string;
  categoryName: string;
  emoji: string;
  color: string;
  avgMonthly: number;
  trend: "rising" | "falling" | "stable";
  slopePercent: number;
  isRecurring: boolean;
  peakMonth: string;
  monthsPresent: number;
  totalSpent: number;
  lastMonthAmount: number;
  series: number[];
}

interface PatternsData {
  patterns: Pattern[];
  topGrowingCosts: Pattern[];
  recurringFixed: Pattern[];
  cashflowVolatility: number;
  avgPaymentDelay: number | null;
  incomeConcentration: number;
  topClient: { name: string; revenue: number } | null;
  monthLabels: string[];
  recommendations: string[];
}

function fmt(n: number) {
  return n.toLocaleString("pl-PL") + " zł";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising") return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (trend === "falling") return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function PatternsClient() {
  const { data, isLoading } = useQuery<PatternsData>({
    queryKey: ["patterns"],
    queryFn: () => fetch("/api/patterns").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { patterns, topGrowingCosts, recurringFixed, cashflowVolatility, avgPaymentDelay, incomeConcentration, topClient, recommendations } = data;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Cykl finansowy</h1>
        <p className="text-muted-foreground text-sm mt-1">Analiza algorytmiczna Twoich wzorców wydatków i przychodów</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Zmienność cashflow</div>
          <div className={`text-2xl font-bold ${cashflowVolatility > 60 ? "text-red-500" : cashflowVolatility > 30 ? "text-amber-500" : "text-emerald-500"}`}>
            {cashflowVolatility}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {cashflowVolatility > 60 ? "Wysoka — ryzyko" : cashflowVolatility > 30 ? "Umiarkowana" : "Niska — stabilna"}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Śr. czas płatności</div>
          <div className={`text-2xl font-bold ${(avgPaymentDelay ?? 0) > 30 ? "text-amber-500" : "text-emerald-500"}`}>
            {avgPaymentDelay !== null ? `${avgPaymentDelay} dni` : "–"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">od wystawienia faktury</div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Koncentracja przychodów</div>
          <div className={`text-2xl font-bold ${incomeConcentration >= 70 ? "text-red-500" : incomeConcentration >= 50 ? "text-amber-500" : "text-emerald-500"}`}>
            {incomeConcentration}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">{topClient?.name ?? "—"}</div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Stałe koszty/mies.</div>
          <div className="text-2xl font-bold">
            {fmt(recurringFixed.reduce((s, p) => s + p.avgMonthly, 0))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{recurringFixed.length} kategorii cyklicznych</div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Rekomendacje
          </h2>
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-amber-500 mt-0.5 shrink-0">•</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top growing costs */}
      {topGrowingCosts.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-red-500" />
            Rosnące koszty
          </h2>
          <div className="space-y-3">
            {topGrowingCosts.map((p) => (
              <div key={p.categoryId} className="flex items-center gap-3">
                <span className="text-xl">{p.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.categoryName}</span>
                    <span className="text-xs text-red-500">+{p.slopePercent}%/mies.</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500/70 rounded-full"
                      style={{ width: `${Math.min(100, Math.abs(p.slopePercent) * 2)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{fmt(p.avgMonthly)}</div>
                  <div className="text-xs text-muted-foreground">śr./mies.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: recurring fixed + spending chart */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recurring fixed costs */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Stałe koszty cykliczne
          </h2>
          <div className="space-y-2">
            {recurringFixed.length === 0 && (
              <div className="text-sm text-muted-foreground">Brak danych za ostatnie 12 miesięcy</div>
            )}
            {recurringFixed.map((p) => (
              <div key={p.categoryId} className="flex items-center gap-2 text-sm">
                <span>{p.emoji}</span>
                <span className="flex-1">{p.categoryName}</span>
                <span className="text-xs text-muted-foreground">{p.monthsPresent}/12 mies.</span>
                <span className="font-medium">{fmt(p.avgMonthly)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category spending bar chart */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Wydatki wg kategorii (12 mies.)</h2>
          {patterns.length === 0 ? (
            <div className="text-sm text-muted-foreground">Brak danych</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={patterns.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="categoryName" width={90} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [String(v).toLocaleString() + " zł", "Łącznie"]}
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="totalSpent" radius={[0, 4, 4, 0]}>
                  {patterns.slice(0, 8).map((p, i) => (
                    <Cell key={i} fill={p.color || "#6366f1"} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* All patterns table */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Wszystkie kategorie — szczegóły
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="text-left pb-3">Kategoria</th>
                <th className="text-right pb-3">Śr./mies.</th>
                <th className="text-right pb-3">Ostatni mies.</th>
                <th className="text-right pb-3">Łącznie</th>
                <th className="text-center pb-3">Trend</th>
                <th className="text-center pb-3">Cykliczny</th>
                <th className="text-right pb-3">Szczyt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {patterns.map((p) => (
                <tr key={p.categoryId} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5">
                    <span className="mr-2">{p.emoji}</span>
                    {p.categoryName}
                  </td>
                  <td className="text-right py-2.5">{fmt(p.avgMonthly)}</td>
                  <td className="text-right py-2.5">{fmt(p.lastMonthAmount)}</td>
                  <td className="text-right py-2.5 font-medium">{fmt(p.totalSpent)}</td>
                  <td className="text-center py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon trend={p.trend} />
                      <span className={`text-xs ${p.trend === "rising" ? "text-red-500" : p.trend === "falling" ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {p.slopePercent > 0 ? "+" : ""}{p.slopePercent}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-2.5">
                    {p.isRecurring ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Tak</span>
                    ) : (
                      <span className="text-xs bg-white/10 text-muted-foreground px-2 py-0.5 rounded-full">Nie</span>
                    )}
                  </td>
                  <td className="text-right py-2.5 text-muted-foreground">{p.peakMonth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
