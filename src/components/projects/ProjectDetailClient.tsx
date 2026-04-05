"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { storage, type StoredEntity } from "@/lib/storage";
import { getProject, transactionsForProject, updateProject, deleteProject } from "@/lib/projects";
import type { Project, Kontrahent, Transaction, ProjectStatus } from "@/lib/types";
import { useVault } from "@/components/vault/VaultProvider";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_OPTIONS: ProjectStatus[] = ["active", "done", "archived"];
const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Aktywny",
  done: "Zakończony",
  archived: "Zarchiwizowany",
};

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { unlocked } = useVault();
  const [project, setProject] = React.useState<StoredEntity<Project> | null>(null);
  const [kontrahent, setKontrahent] = React.useState<Kontrahent | null>(null);
  const [transactions, setTransactions] = React.useState<StoredEntity<Transaction>[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProject(projectId);
      setProject(p);
      if (p?.data.kontrahent_id) {
        const k = await storage.getById<Kontrahent>("kontrahent", p.data.kontrahent_id);
        setKontrahent(k?.data ?? null);
      } else {
        setKontrahent(null);
      }
      const all = await storage.getAll<Transaction>("transaction");
      setTransactions(transactionsForProject(projectId, all));
    } catch {
      // locked
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  const summary = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.data.type === "przychod") income += t.data.amount;
      else expense += t.data.amount;
    }
    return { income, expense, result: income - expense };
  }, [transactions]);

  async function changeStatus(status: ProjectStatus) {
    if (!project) return;
    await updateProject(project.id, { status });
    await load();
  }

  async function remove() {
    if (!project) return;
    if (!confirm("Usunąć projekt? Transakcje zostaną odłączone, nie zostaną usunięte.")) return;
    // Detach transactions from the project first.
    for (const t of transactions) {
      await storage.update<Transaction>("transaction", t.id, (prev) => ({
        ...prev,
        project_id: undefined,
      }));
    }
    await deleteProject(project.id);
    toast.success("Projekt usunięty");
    window.location.href = "/projects";
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Wczytuję…</div>;
  if (!project) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Nie znaleziono projektu.</p>
        <Link href="/projects" className="text-sm underline">
          Wróć do listy
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/projects" className="text-xs text-muted-foreground hover:underline">
            ← Projekty
          </Link>
          <h1 className="text-2xl font-semibold truncate">{project.data.name}</h1>
          {kontrahent && project.data.kontrahent_id && (
            <p className="text-sm text-muted-foreground">
              Kontrahent:{" "}
              <Link
                href={`/contractors/${project.data.kontrahent_id}`}
                className="underline hover:text-foreground"
              >
                {kontrahent.name}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={project.data.status}
            onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={remove}>
            Usuń projekt
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Przychody</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(summary.income)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Wydatki</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(summary.expense)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Wynik</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(summary.result)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transakcje projektu ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak transakcji przypisanych do tego projektu.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{t.data.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(t.data.date)}
                      {t.data.kontrahent_id && (
                        <>
                          {" · "}
                          <Link
                            href={`/contractors/${t.data.kontrahent_id}`}
                            className="underline hover:text-foreground"
                          >
                            kontrahent
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={
                      t.data.type === "przychod"
                        ? "text-sm font-medium text-emerald-600"
                        : "text-sm font-medium"
                    }
                  >
                    {t.data.type === "przychod" ? "+" : "−"}
                    {formatCurrency(t.data.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
