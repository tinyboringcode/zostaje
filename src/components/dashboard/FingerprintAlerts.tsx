"use client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Anomaly {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  expectedAmount: number;
  zScore: number;
  direction: "high" | "low";
  severity: "mild" | "notable" | "strong";
}

interface FingerprintResponse {
  anomalies: Anomaly[];
  insufficient: boolean;
  txCount: number;
}

const fmt = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export function FingerprintAlerts() {
  const { data } = useQuery<FingerprintResponse>({
    queryKey: ["fingerprint"],
    queryFn: () => fetch("/api/fingerprint").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  if (!data || data.insufficient || data.anomalies.length === 0) return null;

  const notable = data.anomalies.filter((a) => a.severity !== "mild").slice(0, 3);
  if (!notable.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Anomalie finansowe
        </span>
      </div>
      {notable.map((a) => (
        <div
          key={a.categoryId}
          className={cn(
            "glass rounded-lg px-3.5 py-2.5 flex items-center gap-3 border",
            a.direction === "high"
              ? "border-red-500/20 bg-red-500/5"
              : "border-amber-500/20 bg-amber-500/5"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            a.direction === "high" ? "bg-red-500/15" : "bg-amber-500/15"
          )}>
            {a.direction === "high"
              ? <TrendingUp className="h-4 w-4 text-red-500" />
              : <TrendingDown className="h-4 w-4 text-amber-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{a.categoryName}</p>
            <p className="text-xs text-muted-foreground">
              {a.direction === "high" ? "Powyżej normy" : "Poniżej normy"} ·{" "}
              obecny: {fmt.format(a.currentAmount)} · oczekiwany: {fmt.format(a.expectedAmount)}
            </p>
          </div>
          <span className={cn(
            "text-xs font-semibold shrink-0 px-1.5 py-0.5 rounded",
            a.severity === "strong"
              ? "bg-red-500/20 text-red-600 dark:text-red-400"
              : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          )}>
            {a.severity === "strong" ? "!" : "~"}{Math.abs(a.zScore).toFixed(1)}σ
          </span>
        </div>
      ))}
    </div>
  );
}
