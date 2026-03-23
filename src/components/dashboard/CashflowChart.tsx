"use client";
import { Card, CardBody } from "@heroui/react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { monthLabel } from "@/lib/formatters";

interface CashflowData { month: string; income: number; expense: number; }

const formatK = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString();

export function CashflowChart({ data, isLoading }: { data?: CashflowData[]; isLoading: boolean }) {
  const chartData = data?.map((d) => ({ ...d, label: monthLabel(d.month) }));

  return (
    <Card className="glass border-0" shadow="none">
      <CardBody className="p-5">
        <div className="font-semibold text-sm mb-4">Cashflow — ostatnie 12 miesięcy</div>
        {isLoading ? (
          <div className="h-64 bg-default-100 animate-pulse rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
              <Tooltip
                contentStyle={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(100,116,235,0.15)", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                formatter={(v, name) => [
                  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(Number(v)),
                  name === "income" ? "Przychody" : "Wydatki",
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend formatter={(v) => v === "income" ? "Przychody" : "Wydatki"} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" fill="#22c55e" radius={[5, 5, 0, 0]} opacity={0.85} />
              <Bar dataKey="expense" fill="#ef4444" radius={[5, 5, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
