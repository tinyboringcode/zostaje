"use client";
import { Card, CardBody } from "@heroui/react";
import CountUp from "react-countup";
import { TrendingUp, TrendingDown, Wallet, Hash, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPIData {
  income: number;
  expense: number;
  profit: number;
  transactionCount: number;
}

const CARDS = [
  {
    key: "income" as const,
    title: "Przychody",
    icon: TrendingUp,
    gradient: "from-emerald-400/20 to-green-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    valueColor: "text-emerald-700 dark:text-emerald-400",
    trend: ArrowUpRight,
    trendColor: "text-emerald-500",
  },
  {
    key: "expense" as const,
    title: "Wydatki",
    icon: TrendingDown,
    gradient: "from-rose-400/20 to-red-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950",
    valueColor: "text-rose-700 dark:text-rose-400",
    trend: ArrowDownRight,
    trendColor: "text-rose-500",
  },
  {
    key: "profit" as const,
    title: "Zysk netto",
    icon: Wallet,
    gradient: "from-blue-400/20 to-indigo-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950",
    valueColor: "text-blue-700 dark:text-blue-400",
    trend: null,
    trendColor: "",
  },
  {
    key: "transactionCount" as const,
    title: "Transakcje",
    icon: Hash,
    gradient: "from-violet-400/20 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950",
    valueColor: "text-foreground",
    trend: null,
    trendColor: "",
  },
];

export function KPICards({ kpi, isLoading }: { kpi?: KPIData; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, idx) => {
        const Icon = card.icon;
        const value = kpi?.[card.key] ?? 0;
        const isCurrency = card.key !== "transactionCount";
        const profitNegative = card.key === "profit" && value < 0;

        return (
          <Card
            key={card.key}
            className={`glass glow-hover border-0 bg-gradient-to-br ${card.gradient} relative overflow-hidden`}
            shadow="none"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <CardBody className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-2xl ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                {card.trend && !isLoading && (
                  <card.trend className={`h-4 w-4 ${card.trendColor} opacity-60`} />
                )}
              </div>
              <div className="text-xs font-semibold text-default-500 uppercase tracking-widest mb-1">
                {card.title}
              </div>
              {isLoading ? (
                <div className="h-7 w-28 bg-default-100 animate-pulse rounded-lg" />
              ) : (
                <div className={`text-2xl font-bold ${profitNegative ? "text-rose-600 dark:text-rose-400" : card.valueColor}`}>
                  {isCurrency ? (
                    <>
                      <CountUp
                        start={0}
                        end={Math.abs(value)}
                        duration={1.2}
                        decimals={2}
                        decimal=","
                        separator=" "
                        prefix={profitNegative ? "−" : value < 0 && card.key === "profit" ? "−" : ""}
                        suffix=" zł"
                        useEasing
                      />
                    </>
                  ) : (
                    <CountUp start={0} end={value} duration={1} useEasing />
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
