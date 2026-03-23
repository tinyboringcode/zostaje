"use client";
import { useDisclosure } from "@/contexts/DisclosureContext";
import { Unlock, Zap } from "lucide-react";

export function ProgressCard() {
  const { data, isLoading } = useDisclosure();

  if (isLoading || !data) return null;
  if (!data.nextUnlock) return null; // all unlocked

  const { nextUnlock, progressPct, txCount } = data;

  return (
    <div className="glass rounded-xl p-4 border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Unlock className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-sm font-medium">Następna funkcja</p>
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{nextUnlock.hint}</p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">{nextUnlock.label}</span>
            <span className="text-xs text-muted-foreground">— {nextUnlock.description}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-2">
        Masz {txCount} transakcji · im więcej danych, tym więcej automagii
      </p>
    </div>
  );
}
