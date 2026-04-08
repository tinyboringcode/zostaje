"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, monthLabel } from "@/lib/formatters";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useVaultMonthly, useVaultByCategory } from "@/hooks/useVaultTransactions";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PDFReportDialog } from "./PDFReportDialog";
import { FileText } from "lucide-react";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function ReportsClient() {
  const [year, setYear] = useState(currentYear);
  const [pdfOpen, setPdfOpen] = useState(false);

  const { data: monthly, isLoading: monthlyLoading } = useVaultMonthly(year);
  const { data: byCategory, isLoading: catLoading } = useVaultByCategory(year);

  const monthlyChartData = monthly
    ? Object.entries(monthly).map(([m, d]) => ({ label: monthLabel(m), ...d }))
    : [];

  const totals = monthly
    ? Object.values(monthly).reduce(
        (acc, v) => ({
          income: acc.income + v.income,
          expense: acc.expense + v.expense,
          profit: acc.profit + v.profit,
        }),
        { income: 0, expense: 0, profit: 0 }
      )
    : null;

  const handleExport = () => {
    window.location.href = `/api/reports/export?year=${year}`;
  };

  const handleJpkExport = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const m = window.prompt("JPK — podaj miesiac (YYYY-MM):", month);
    if (m && /^\d{4}-\d{2}$/.test(m)) {
      window.location.href = `/api/reports/jpk?month=${m}`;
    } else if (m) {
      alert("Nieprawidlowy format miesiaca. Uzyj YYYY-MM, np. 2026-04");
    }
  };

  return (
    <PageWrapper
      title="Raporty"
      maxWidth="xl"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => setPdfOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Raport PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Eksport CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleJpkExport}>
            <Download className="h-4 w-4 mr-2" />
            Eksport JPK
          </Button>
        </div>
      }
    >
      {/* Annual summary */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Przychody", value: totals.income, color: "text-green-600 dark:text-green-400" },
            { label: "Wydatki", value: totals.expense, color: "text-red-600 dark:text-red-400" },
            { label: "Zysk netto", value: totals.profit, color: totals.profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{item.label} {year}</p>
                <p className={`text-xl font-bold mt-1 ${item.color}`}>{formatCurrency(item.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Miesieczne</TabsTrigger>
          <TabsTrigger value="category">Per kategoria</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Przychody vs Wydatki {year}</CardTitle></CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip formatter={(v, name) => [formatCurrency(Number(v)), name === "income" ? "Przychody" : name === "expense" ? "Wydatki" : "Zysk"]} />
                    <Legend formatter={(v) => v === "income" ? "Przychody" : v === "expense" ? "Wydatki" : "Zysk"} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Miesiac</th>
                      <th className="text-right py-2 font-medium text-green-600">Przychody</th>
                      <th className="text-right py-2 font-medium text-red-600">Wydatki</th>
                      <th className="text-right py-2 font-medium">Zysk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyLoading
                      ? Array.from({ length: 12 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {[1,2,3,4].map(j => <td key={j} className="py-2"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                          </tr>
                        ))
                      : monthly && Object.entries(monthly).map(([m, d]) => (
                          <tr key={m} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 capitalize">{monthLabel(m)}</td>
                            <td className="py-2 text-right text-green-600 dark:text-green-400">{formatCurrency(d.income)}</td>
                            <td className="py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(d.expense)}</td>
                            <td className={`py-2 text-right font-medium ${d.profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                              {formatCurrency(d.profit)}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {catLoading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : !byCategory || byCategory.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Brak danych za {year}</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map((c) => {
                    const maxVal = byCategory[0]?.total ?? 1;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{c.category}</span>
                          <span className="font-medium">{formatCurrency(c.total)}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(c.total / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PDFReportDialog open={pdfOpen} onClose={() => setPdfOpen(false)} />
    </PageWrapper>
  );
}
