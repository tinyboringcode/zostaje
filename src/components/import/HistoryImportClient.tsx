"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, CheckCircle2, AlertCircle, FileText, Download, ChevronDown, ChevronRight,
  ClipboardList, Database, ArrowRight, Info,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/csv-parser";

interface Category {
  id: string;
  name: string;
  emoji: string;
  type: string;
}

const STEPS = [
  {
    number: 1,
    title: "Przygotuj dane w arkuszu kalkulacyjnym",
    description: "Otwórz Excel, Google Sheets lub Numbers i utwórz arkusz z historią transakcji.",
    details: [
      "Zbierz wyciągi bankowe z całego okresu, który chcesz zaimportować",
      "Każdy wiersz = jedna transakcja (przychód lub wydatek)",
      "Kolumny muszą być w odpowiedniej kolejności (patrz format poniżej)",
      "Nie dołączaj nagłówków — plik powinien zaczynać się od pierwszej transakcji",
    ],
  },
  {
    number: 2,
    title: "Sformatuj kolumny zgodnie z formatem CSV",
    description: "Każdy wiersz musi zawierać 4 kolumny oddzielone średnikiem (;).",
    details: [],
  },
  {
    number: 3,
    title: "Eksportuj jako CSV (UTF-8)",
    description: "Zapisz plik jako CSV z separatorem średnik i kodowaniem UTF-8.",
    details: [
      "Excel: Plik → Zapisz jako → CSV UTF-8 (rozdzielany średnikami)",
      "Google Sheets: Plik → Pobierz → Wartości rozdzielane przecinkami (zmień separator w kroku 2)",
      "LibreOffice: Plik → Eksportuj jako → CSV → separator: średnik, kodowanie: UTF-8",
      "Sprawdź podgląd pliku w Notatniku — powinien zawierać wiersze rozdzielone średnikiem",
    ],
  },
  {
    number: 4,
    title: "Wczytaj i zaimportuj plik",
    description: "Przeciągnij plik CSV do pola poniżej lub kliknij, aby wybrać plik.",
    details: [
      "System pokaże podgląd pierwszych transakcji",
      "Wybierz domyślną kategorię (możesz ją później zmienić przy każdej transakcji)",
      "Kliknij Importuj — transakcje zostaną dodane do bazy",
      "Po imporcie przejdź do Transakcje, aby przypisać właściwe kategorie",
    ],
  },
];

const FORMAT_COLUMNS = [
  { col: "A — Data", format: "YYYY-MM-DD", example: "2024-03-15", note: "ISO format — rok-miesiąc-dzień" },
  { col: "B — Opis", format: "Tekst", example: "Faktura nr FV/2024/03", note: "Dowolny opis transakcji" },
  { col: "C — Kwota", format: "Liczba dodatnia", example: "1500.00", note: "Zawsze dodatnia — typ określa kolumna D" },
  { col: "D — Typ", format: "INCOME lub EXPENSE", example: "INCOME", note: "INCOME = przychód, EXPENSE = wydatek" },
];

const EXAMPLE_ROWS = [
  "2024-01-05;Przychód ze sprzedaży usług;5000.00;INCOME",
  "2024-01-10;Faktura Allegro marketing;320.50;EXPENSE",
  "2024-01-15;Wynagrodzenie za projekt A;8500.00;INCOME",
  "2024-02-01;Abonament narzędzi SaaS;199.00;EXPENSE",
  "2024-02-14;Zaliczka projekt B;3000.00;INCOME",
];

function StepCard({ step, isOpen, onToggle }: { step: typeof STEPS[0]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {step.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{step.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</div>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-3">
          {step.number === 2 ? (
            <FormatTable />
          ) : (
            <ul className="space-y-1.5">
              {step.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FormatTable() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Kolumna</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Format</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Przykład</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Uwaga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {FORMAT_COLUMNS.map((col) => (
              <tr key={col.col}>
                <td className="px-3 py-2 font-medium text-primary text-xs">{col.col}</td>
                <td className="px-3 py-2 text-xs">{col.format}</td>
                <td className="px-3 py-2 font-mono text-xs text-emerald-400">{col.example}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{col.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Przykładowy plik CSV:</div>
        <div className="bg-black/30 rounded-lg p-3 font-mono text-xs space-y-0.5">
          {EXAMPLE_ROWS.map((row, i) => (
            <div key={i} className="text-emerald-300">{row}</div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200">
          <strong>Ważne:</strong> separator to średnik (;), nie przecinek. Kwoty z kropką dziesiętną (1500.00), nie przecinkiem.
          Data w formacie YYYY-MM-DD (np. 2024-03-15). Plik bez nagłówka.
        </div>
      </div>
    </div>
  );
}

export function HistoryImportClient() {
  const qc = useQueryClient();
  const [openStep, setOpenStep] = useState<number | null>(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedTransaction[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const handleFile = async (f: File) => {
    setFile(f);
    const text = await f.text();
    const lines = text.split("\n").filter(Boolean).slice(0, 10);
    const parsed: ParsedTransaction[] = [];
    for (const line of lines) {
      const parts = line.split(";");
      if (parts.length < 3) continue;
      const [dateStr, description, amount, type] = parts;
      const parsedDate = new Date(dateStr.trim());
      if (isNaN(parsedDate.getTime())) continue;
      parsed.push({
        date: parsedDate,
        description: description.trim(),
        amount: Math.abs(parseFloat(amount.replace(",", "."))),
        type: (type?.trim().toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE") as "INCOME" | "EXPENSE",
      });
    }
    setPreview(parsed);
  };

  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Brak pliku");
      const text = await file.text();
      const fd = new FormData();
      fd.append("file", new Blob([text], { type: "text/csv" }), file.name);
      fd.append("categoryId", categoryId);
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Błąd importu"); }
      return res.json();
    },
    onSuccess: (d) => {
      toast.success(`Zaimportowano ${d.count} transakcji`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setFile(null);
      setPreview([]);
      setCategoryId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const content = EXAMPLE_ROWS.join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "szablon_historia.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Import historii finansowej</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Przenieś dotychczasowe transakcje do systemu — krok po kroku
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: ClipboardList, label: "Wymagane kroki", value: "4" },
          { icon: FileText, label: "Format pliku", value: "CSV" },
          { icon: Database, label: "Limit wierszy", value: "Brak" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
            <s.icon className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="font-bold text-sm">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Step-by-step instructions */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Instrukcja krok po kroku</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Pobierz szablon CSV
          </button>
        </div>

        {STEPS.map((step, i) => (
          <StepCard
            key={step.number}
            step={step}
            isOpen={openStep === i}
            onToggle={() => setOpenStep(openStep === i ? null : i)}
          />
        ))}
      </div>

      {/* File upload */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Wczytaj plik CSV
        </h2>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-white/20 hover:border-primary/50 hover:bg-white/5"
          )}
        >
          <Upload className={cn("h-8 w-8 mx-auto mb-2", isDragging ? "text-primary" : "text-muted-foreground")} />
          {file ? (
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{preview.length}+ transakcji odczytano w podglądzie</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">Przeciągnij plik CSV lub kliknij</p>
              <p className="text-xs text-muted-foreground mt-1">Format: data;opis;kwota;typ</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-white/5 px-3 py-2 text-xs text-muted-foreground font-medium">
              Podgląd pierwszych {preview.length} wierszy
            </div>
            <div className="divide-y divide-white/5">
              {preview.map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      tx.type === "INCOME" ? "bg-emerald-500" : "bg-red-500"
                    )} />
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(tx.date)}</span>
                    <span className="truncate text-sm">{tx.description}</span>
                  </div>
                  <span className={cn(
                    "ml-3 font-semibold shrink-0 text-sm",
                    tx.type === "INCOME" ? "text-emerald-500" : "text-red-500"
                  )}>
                    {tx.type === "INCOME" ? "+" : "−"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category + import button */}
        {file && (
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground block">Domyślna kategoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-white/20 bg-background text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Wybierz kategorię...</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => csvMutation.mutate()}
              disabled={!categoryId || csvMutation.isPending}
              className="h-10 px-5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {csvMutation.isPending ? "Importuję..." : "Importuj historię"}
            </button>
          </div>
        )}

        {csvMutation.isSuccess && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Import zakończony! Transakcje są widoczne w zakładce Transakcje.
          </div>
        )}
        {csvMutation.isError && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            {(csvMutation.error as Error).message}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Wskazówki dla istniejących firm</h2>
        <div className="space-y-3">
          {[
            {
              title: "Eksport z banku",
              desc: "Większość banków (PKO BP, mBank, ING, Santander) umożliwia eksport historii rachunku do CSV lub XLS. Szukaj opcji w historii transakcji → Eksportuj.",
            },
            {
              title: "Faktury z poprzednich lat",
              desc: "Jeśli masz faktury w programie księgowym (np. inFakt, wFirma, Fakturownia) — eksportuj je jako CSV i dostosuj kolumny do naszego formatu.",
            },
            {
              title: "Po imporcie",
              desc: "Przejdź do zakładki Transakcje i przypisz kategorie do zaimportowanych pozycji. System automatycznie uwzględni historię w raportach i wskaźnikach.",
            },
            {
              title: "Duże wolumeny",
              desc: "Możesz importować wielokrotnie — każdy import dodaje nowe transakcje bez duplikowania. Importuj po roku lub kwartale dla większej przejrzystości.",
            },
          ].map((tip) => (
            <div key={tip.title} className="flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium">{tip.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
