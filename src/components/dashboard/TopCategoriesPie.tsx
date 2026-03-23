"use client";
import { Card, CardBody } from "@heroui/react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface CategoryData { name: string; color: string; emoji: string; total: number; }

export function TopCategoriesPie({ data, isLoading }: { data?: CategoryData[]; isLoading: boolean }) {
  return (
    <Card className="glass border-0 h-full" shadow="none">
      <CardBody className="p-5">
        <div className="font-semibold text-sm mb-4">Top wydatki</div>
        {isLoading ? (
          <div className="h-64 bg-default-100 animate-pulse rounded-xl" />
        ) : !data || data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-default-400 text-sm">
            Brak danych za ten miesiąc
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={38} strokeWidth={0}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.88} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(100,116,235,0.15)", borderRadius: "12px" }}
                  formatter={(v) => [formatCurrency(Number(v)), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2">
              {data.map((cat, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate text-default-600">{cat.emoji} {cat.name}</span>
                  </div>
                  <span className="font-semibold ml-2 shrink-0 text-danger">{formatCurrency(cat.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
