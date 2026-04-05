"use client";

import * as React from "react";
import { readSyncStatus, type SyncStatus } from "@/lib/sync";
import { isPro, fetchPlan } from "@/lib/pro";
import { cn } from "@/lib/utils";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export function SyncStatusIndicator() {
  const [state, setState] = React.useState(() => readSyncStatus());
  const [pro, setPro] = React.useState<boolean>(isPro());

  React.useEffect(() => {
    fetchPlan().then((p) => setPro(p === "pro"));
    const onUpdate = () => setState(readSyncStatus());
    window.addEventListener("zostaje:sync-status", onUpdate as EventListener);
    const interval = setInterval(onUpdate, 5000);
    return () => {
      window.removeEventListener("zostaje:sync-status", onUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  if (!pro) return null;

  const { status, lastAt, error } = state;
  const dotColor: Record<SyncStatus, string> = {
    idle: "bg-zinc-400",
    syncing: "bg-amber-500 animate-pulse",
    ok: "bg-emerald-500",
    error: "bg-red-500",
  };

  const label = (() => {
    if (status === "syncing") return "Synchronizuję…";
    if (status === "ok") return `Zsynchronizowano ${formatTime(lastAt)}`;
    if (status === "error") return "Błąd sync";
    return "Bezczynny";
  })();

  return (
    <button
      className="w-full flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (status === "error" && error) alert(`Sync error:\n${error}`);
      }}
      title={error ?? label}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor[status])} />
      <span className="truncate">{label}</span>
    </button>
  );
}
