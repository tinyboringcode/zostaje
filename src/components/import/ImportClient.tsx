"use client";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, RefreshCw, CheckCircle2, AlertCircle, FolderOpen, Zap, Camera, ScanLine } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  emoji: string;
  type: string;
}

import type { ParsedTransaction as ParsedTx } from "@/lib/csv-parser";

interface FolderFile {
  filename: string;
  path: string;
  size: number;
  modifiedAt: string;
  transactionCount: number;
  preview: ParsedTx[];
}

export function ImportClient() {
  const qc = useQueryClient();

  // CSV manual upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedTx[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Camera OCR state
  const cameraRef = useRef<HTMLInputElement>(null);
  const [ocrResult, setOcrResult] = useState<{ amount: number | null; date: string | null; vendor: string | null; description: string | null } | null>(null);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrType, setOcrType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [ocrCategoryId, setOcrCategoryId] = useState("");

  // KSeF state
  const [ksefFrom, setKsefFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [ksefTo, setKsefTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const { data: settings } = useQuery<{
    ksefEnabled: boolean; ksefEnvironment: string;
    watchFolderEnabled: boolean; watchFolderPath: string;
    ollamaEnabled: boolean;
  }>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const { data: folderData, refetch: refetchFolder } = useQuery<{ files: FolderFile[]; folderPath?: string; error?: string }>({
    queryKey: ["folder-scan"],
    queryFn: () => fetch("/api/import/scan-folder").then((r) => r.json()),
    enabled: settings?.watchFolderEnabled,
    refetchInterval: 30_000,
  });

  // Parse CSV file
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    const text = await f.text();
    await fetch("/api/transactions/import", {
      method: "POST",
      body: (() => { const fd = new FormData(); fd.append("file", f); fd.append("categoryId", "preview-only"); return fd; })(),
    }).catch(() => null);
    // Parse client-side for preview
    const { parseCSV } = await import("@/lib/csv-parser");
    const parsed = parseCSV(text);
    setPreview(parsed.slice(0, 10));
  }, []);

  // Drag & drop
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleFile(f);
    else toast.error("Przeciągnij plik CSV");
  }, [handleFile]);

  // CSV import mutation
  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!file || !categoryId) throw new Error("Brak pliku lub kategorii");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categoryId", categoryId);
      const res = await fetch("/api/transactions/import", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Zaimportowano ${data.imported} transakcji`);
      setFile(null); setPreview([]); setCategoryId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // KSeF sync mutation
  const ksefMutation = useMutation({
    mutationFn: () =>
      fetch("/api/ksef/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: ksefFrom, to: ksefTo }),
      }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`KSeF: zaimportowano ${data.imported}, pominięto ${data.skipped} (duplikaty)`);
    },
    onError: (e: Error) => toast.error(`KSeF error: ${e.message}`),
  });

  // Watch folder import
  const folderImportMutation = useMutation({
    mutationFn: ({ filePath, catId }: { filePath: string; catId: string }) =>
      fetch("/api/import/scan-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, categoryId: catId }),
      }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["folder-scan"] });
      toast.success(`Zaimportowano ${data.imported} transakcji z ${data.file}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCameraFile = async (f: File) => {
    setOcrLoading(true);
    setOcrResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setOcrImage(e.target?.result as string);
    reader.readAsDataURL(f);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const res = await fetch("/api/ai/receipt", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Błąd OCR"); return; }
      setOcrResult(data);
    } catch {
      toast.error("Nie udało się przetworzyć zdjęcia");
    } finally {
      setOcrLoading(false);
    }
  };

  const ocrSaveMutation = useMutation({
    mutationFn: async () => {
      if (!ocrResult?.amount || !ocrCategoryId) throw new Error("Brak kwoty lub kategorii");
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: ocrResult.amount,
          date: ocrResult.date ?? new Date().toISOString().split("T")[0],
          description: ocrResult.description ?? ocrResult.vendor ?? "Skan dokumentu",
          type: ocrType,
          categoryId: ocrCategoryId,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transakcja dodana ze skanu");
      setOcrResult(null); setOcrImage(null); setOcrCategoryId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Import danych</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importuj transakcje z różnych źródeł bez ręcznego przepisywania
        </p>
      </div>

      {/* KSeF */}
      {settings?.ksefEnabled && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              KSeF — automatyczny import faktur
              <Badge variant="outline" className="text-xs ml-auto">
                {settings.ksefEnvironment === "test" ? "Środowisko testowe" : "Produkcja"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Pobiera faktury kosztowe z Krajowego Systemu e-Faktur MF automatycznie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="space-y-1">
                <Label>Od</Label>
                <input type="date" value={ksefFrom} onChange={(e) => setKsefFrom(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <Label>Do</Label>
                <input type="date" value={ksefTo} onChange={(e) => setKsefTo(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <Button onClick={() => ksefMutation.mutate()} disabled={ksefMutation.isPending}>
                {ksefMutation.isPending ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Pobieranie...</> : "Synchronizuj z KSeF"}
              </Button>
            </div>
            {ksefMutation.isSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Ostatnia synchronizacja zakończona pomyślnie
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Watch folder */}
      {settings?.watchFolderEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Obserwowany folder
            </CardTitle>
            <CardDescription>
              {folderData?.folderPath && <code className="text-xs bg-muted px-1 rounded">{folderData.folderPath}</code>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {folderData?.error ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {folderData.error}
              </div>
            ) : !folderData?.files?.length ? (
              <p className="text-sm text-muted-foreground">
                Brak nowych plików CSV w folderze. Skopiuj wyciąg bankowy do:{" "}
                <code className="bg-muted px-1 rounded text-xs">{folderData?.folderPath}</code>
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Znaleziono {folderData.files.length} plik(ów)</span>
                  <Button variant="ghost" size="sm" onClick={() => refetchFolder()}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Odśwież
                  </Button>
                </div>
                {folderData.files.map((f) => (
                  <div key={f.filename} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {f.filename}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {f.transactionCount} transakcji · {new Date(f.modifiedAt).toLocaleDateString("pl-PL")}
                        </div>
                      </div>
                    </div>
                    {f.preview.length > 0 && (
                      <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
                        {f.preview.map((tx, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-muted-foreground truncate mr-2">{tx.description}</span>
                            <span className={cn("shrink-0 font-medium", tx.type === "INCOME" ? "text-green-600" : "text-red-600")}>
                              {tx.type === "INCOME" ? "+" : "−"}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                        {f.transactionCount > 3 && (
                          <div className="text-muted-foreground">...i {f.transactionCount - 3} więcej</div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select onValueChange={(v) => folderImportMutation.mutate({ filePath: f.path, catId: v })}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Wybierz kategorię i importuj..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Camera / OCR scan */}
      {settings?.ollamaEnabled && (
        <Card className="border-violet-200 dark:border-violet-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-violet-500" /> Skan dokumentu (OCR)
              <Badge variant="outline" className="text-xs ml-auto text-violet-600 border-violet-300">Mobilny / AI</Badge>
            </CardTitle>
            <CardDescription>
              Zrób zdjęcie aparatem lub wgraj skan — AI automatycznie odczyta kwotę i datę
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {[
                { value: "EXPENSE", label: "💸 Koszt", color: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" },
                { value: "INCOME",  label: "💰 Przychód", color: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOcrType(t.value as "EXPENSE" | "INCOME")}
                  className={cn(
                    "flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                    ocrType === t.value ? t.color : "border-border hover:bg-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Camera / file input */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                "hover:border-violet-400/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20"
              )}
              onClick={() => cameraRef.current?.click()}
            >
              {ocrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <ScanLine className="h-8 w-8 text-violet-500 animate-pulse" />
                  <p className="text-sm font-medium text-violet-600">AI analizuje dokument...</p>
                </div>
              ) : ocrImage ? (
                <img src={ocrImage} alt="skan" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Dotknij, aby zrobić zdjęcie lub wybrać z galerii</p>
                  <p className="text-xs text-muted-foreground">Działa z aparatem na telefonie · JPG, PNG, HEIC</p>
                </div>
              )}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCameraFile(f); }}
              />
            </div>

            {/* OCR result */}
            {ocrResult && (
              <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Odczytano dane
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Kwota</div>
                    <div className="font-bold text-lg">{ocrResult.amount != null ? formatCurrency(ocrResult.amount) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Data</div>
                    <div className="font-medium">{ocrResult.date ?? "nie odczytano"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Opis</div>
                    <div className="font-medium">{ocrResult.vendor ?? ocrResult.description ?? "—"}</div>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label>Kategoria</Label>
                    <Select value={ocrCategoryId} onValueChange={setOcrCategoryId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Wybierz kategorię..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.filter((c) => c.type === ocrType).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => ocrSaveMutation.mutate()}
                    disabled={!ocrCategoryId || !ocrResult.amount || ocrSaveMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {ocrSaveMutation.isPending ? "Zapisuję..." : "Zapisz"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual CSV upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </CardTitle>
          <CardDescription>
            Wyciąg z PKO BP, mBank, Santander, ING, Millennium — przeciągnij lub wybierz plik
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Upload className={cn("h-8 w-8 mx-auto mb-2", isDragging ? "text-primary" : "text-muted-foreground")} />
            {file ? (
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{preview.length}+ transakcji odczytano</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Przeciągnij plik CSV lub kliknij</p>
                <p className="text-xs text-muted-foreground mt-1">Format: data; opis; kwota</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs text-muted-foreground font-medium">
                Podgląd (pierwsze {preview.length} z wielu)
              </div>
              <div className="divide-y">
                {preview.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground mr-2">{formatDate(tx.date)}</span>
                      <span className="truncate">{tx.description}</span>
                    </div>
                    <span className={cn("ml-3 font-medium shrink-0 text-xs", tx.type === "INCOME" ? "text-green-600" : "text-red-600")}>
                      {tx.type === "INCOME" ? "+" : "−"}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {file && (
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label>Domyślna kategoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorię..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => csvMutation.mutate()} disabled={!categoryId || csvMutation.isPending}>
                {csvMutation.isPending ? "Importuję..." : "Importuj"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
