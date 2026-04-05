"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storage, type StoredEntity } from "@/lib/storage";
import { listProjects, createProject, summarize } from "@/lib/projects";
import type { Project, Kontrahent, Transaction, ProjectStatus } from "@/lib/types";
import { useVault } from "@/components/vault/VaultProvider";
import { formatCurrency } from "@/lib/formatters";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Aktywny",
  done: "Zakończony",
  archived: "Zarchiwizowany",
};

export function ProjectsClient() {
  const { unlocked } = useVault();
  const [projects, setProjects] = React.useState<StoredEntity<Project>[]>([]);
  const [kontrahenci, setKontrahenci] = React.useState<StoredEntity<Kontrahent>[]>([]);
  const [transactions, setTransactions] = React.useState<StoredEntity<Transaction>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const [name, setName] = React.useState("");
  const [kontrahentId, setKontrahentId] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ps, ks, ts] = await Promise.all([
        listProjects(),
        storage.getAll<Kontrahent>("kontrahent"),
        storage.getAll<Transaction>("transaction"),
      ]);
      setProjects(ps);
      setKontrahenci(ks);
      setTransactions(ts);
    } catch {
      // locked
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (unlocked) load();
  }, [unlocked, load]);

  const summaries = React.useMemo(() => summarize(transactions), [transactions]);
  const kontrahentById = React.useMemo(() => {
    const m = new Map<string, Kontrahent>();
    for (const k of kontrahenci) m.set(k.id, k.data);
    return m;
  }, [kontrahenci]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Podaj nazwę projektu");
      return;
    }
    await createProject({
      name: name.trim(),
      kontrahent_id: kontrahentId || undefined,
      status: "active",
      created_at: new Date().toISOString(),
    });
    setName("");
    setKontrahentId("");
    setCreating(false);
    await load();
    toast.success("Projekt utworzony");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projekty</h1>
          <p className="text-sm text-muted-foreground">
            Grupuj transakcje wokół konkretnych zleceń lub kontrahentów.
          </p>
        </div>
        <Button onClick={() => setCreating((c) => !c)}>
          {creating ? "Anuluj" : "+ Nowy projekt"}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="space-y-2">
              <Label>Nazwa projektu</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Strona dla Kowalski sp. z o.o." />
            </div>
            <div className="space-y-2">
              <Label>Kontrahent (opcjonalnie)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={kontrahentId}
                onChange={(e) => setKontrahentId(e.target.value)}
              >
                <option value="">— brak —</option>
                {kontrahenci.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.data.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleCreate}>Utwórz projekt</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Wczytuję…</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Brak projektów. Utwórz pierwszy, aby grupować transakcje.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const s = summaries.get(p.id);
            const k = p.data.kontrahent_id ? kontrahentById.get(p.data.kontrahent_id) : null;
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="truncate">{p.data.name}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {STATUS_LABELS[p.data.status]}
                      </span>
                    </CardTitle>
                    {k && <CardDescription>{k.name}</CardDescription>}
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Przychody</span>
                      <span>{formatCurrency(s?.income ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wydatki</span>
                      <span>{formatCurrency(s?.expense ?? 0)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t border-border pt-1 mt-1">
                      <span>Wynik</span>
                      <span>{formatCurrency(s?.result ?? 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
