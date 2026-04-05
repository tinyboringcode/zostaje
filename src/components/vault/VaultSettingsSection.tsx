"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  exportPlainJSON,
  exportEncrypted,
  importEncrypted,
  importPlainJSON,
} from "@/lib/vault-export";
import { listAudit, clearAudit, type AuditEntry } from "@/lib/audit";
import { useVault } from "./VaultProvider";

function formatAuditLine(e: AuditEntry): string {
  const d = new Date(e.timestamp);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const verb =
    e.action === "create" ? "utworzono" : e.action === "update" ? "zmieniono" : "usunięto";
  const entity =
    e.entity === "transaction" ? "transakcję" : e.entity === "kontrahent" ? "kontrahenta" : "ustawienie";
  return `${dd}.${mm} · ${entity} · ${verb}`;
}

export function VaultSettingsSection() {
  const { lock } = useVault();
  const [exportPass, setExportPass] = React.useState("");
  const [importPass, setImportPass] = React.useState("");
  const [importMode, setImportMode] = React.useState<"merge" | "replace">("merge");
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [busy, setBusy] = React.useState(false);

  const loadAudit = React.useCallback(async () => {
    try {
      setEntries(await listAudit(100));
    } catch {
      // vault locked or empty
      setEntries([]);
    }
  }, []);

  React.useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  async function handleJsonExport() {
    setBusy(true);
    try {
      await exportPlainJSON();
      toast.success("Wyeksportowano dane (JSON)");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEncryptedExport() {
    if (!exportPass) {
      toast.error("Podaj hasło do eksportu");
      return;
    }
    setBusy(true);
    try {
      await exportEncrypted(exportPass);
      setExportPass("");
      toast.success("Utworzono zaszyfrowaną kopię");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!importFile) {
      toast.error("Wybierz plik");
      return;
    }
    setBusy(true);
    try {
      if (importFile.name.endsWith(".zostaje")) {
        if (!importPass) {
          toast.error("Podaj hasło pliku");
          return;
        }
        await importEncrypted(importFile, importPass, importMode);
      } else {
        await importPlainJSON(importFile, importMode);
      }
      toast.success("Import zakończony");
      setImportFile(null);
      setImportPass("");
      await loadAudit();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAudit() {
    if (!confirm("Na pewno wyczyścić historię zmian?")) return;
    await clearAudit();
    await loadAudit();
    toast.success("Historia wyczyszczona");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skarbiec — eksport</CardTitle>
          <CardDescription>
            Twoje dane nigdy nie opuszczają tego urządzenia. Eksport pozwala przenieść je na inne.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleJsonExport} disabled={busy}>
              Eksport JSON (odszyfrowany)
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="exp-pass">Hasło eksportu</Label>
            <div className="flex gap-2">
              <Input
                id="exp-pass"
                type="password"
                placeholder="hasło do pliku .zostaje"
                value={exportPass}
                onChange={(e) => setExportPass(e.target.value)}
              />
              <Button onClick={handleEncryptedExport} disabled={busy}>
                Eksport zaszyfrowany .zostaje
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Każdy eksport używa nowej soli — plik jest niezależny od tego urządzenia.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import danych</CardTitle>
          <CardDescription>
            Wczytaj plik JSON lub .zostaje. Możesz scalić z istniejącymi danymi lub je nadpisać.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".json,.zostaje"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
          {importFile?.name.endsWith(".zostaje") && (
            <Input
              type="password"
              placeholder="hasło pliku"
              value={importPass}
              onChange={(e) => setImportPass(e.target.value)}
            />
          )}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              Scal z istniejącymi
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              Nadpisz wszystko
            </label>
          </div>
          <Button onClick={handleImport} disabled={busy || !importFile}>
            Importuj
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Historia zmian</CardTitle>
            <CardDescription>Ostatnie 100 operacji na danych.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={loadAudit}>
              Odśwież
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAudit}>
              Wyczyść historię
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zapisanych zmian.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {entries.map((e) => (
                <li key={e.id} className="py-2">
                  {formatAuditLine(e)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zablokuj skarbiec</CardTitle>
          <CardDescription>
            Wyczyść klucz z pamięci. Aby wrócić, podasz hasło jeszcze raz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={lock}>
            Zablokuj teraz
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
