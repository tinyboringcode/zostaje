"use client";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface ScanResult {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  description: string | null;
  vatAmount: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (data: { amount?: string; date?: string; description?: string }) => void;
}

export function ReceiptScanner({ open, onClose, onApply }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const scan = async (file: File) => {
    setScanning(true);
    setResult(null);

    // Podgląd obrazu
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/ai/receipt", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        if (data.error.includes("not enabled")) {
          toast.error("Ollama AI nie jest włączone. Włącz je w Ustawieniach → Lokalne AI.");
        } else {
          toast.error(`Błąd OCR: ${data.error}`);
        }
        return;
      }
      setResult(data);
    } catch {
      toast.error("Nie udało się połączyć z modelem AI");
    } finally {
      setScanning(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) scan(file);
    e.target.value = "";
  };

  const handleApply = () => {
    if (!result) return;
    const data: { amount?: string; date?: string; description?: string } = {};
    if (result.amount) data.amount = String(result.amount);
    if (result.date) data.date = result.date;
    if (result.vendor || result.description) {
      data.description = [result.vendor, result.description].filter(Boolean).join(" — ");
    }
    onApply(data);
    onClose();
    toast.success("Dane z paragonu wczytane do formularza");
  };

  const reset = () => { setResult(null); setPreview(null); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Skanuj paragon / fakturę
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result && !scanning && (
            <>
              <p className="text-sm text-muted-foreground">
                Zrób zdjęcie paragonu lub wybierz plik — AI odczyta kwotę, datę i sprzedawcę.
                Wymaga modelu <strong>llava</strong> w Ollama.
              </p>

              {preview && (
                <div className="relative rounded-lg overflow-hidden border aspect-video bg-muted">
                  <img src={preview} alt="Podgląd" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground"
                >
                  <Camera className="h-8 w-8" />
                  Aparat
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground"
                >
                  <Upload className="h-8 w-8" />
                  Z pliku
                </button>
              </div>

              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            </>
          )}

          {scanning && (
            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm">AI analizuje paragon...</p>
              <p className="text-xs opacity-60">Może potrwać do 30 sekund</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {preview && (
                <div className="rounded-lg overflow-hidden border aspect-video bg-muted">
                  <img src={preview} alt="Paragon" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-3">
                  <CheckCircle className="h-4 w-4" />
                  Rozpoznane dane
                </div>
                {[
                  { label: "Kwota", value: result.amount ? `${result.amount} zł` : null },
                  { label: "Data", value: result.date },
                  { label: "Sprzedawca", value: result.vendor },
                  { label: "Opis", value: result.description },
                  { label: "Kwota VAT", value: result.vatAmount ? `${result.vatAmount} zł` : null },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium">
                      {value ?? <span className="text-muted-foreground/50 italic">nie rozpoznano</span>}
                    </span>
                  </div>
                ))}
              </div>

              {(!result.amount && !result.date && !result.vendor) && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Nie udało się rozpoznać danych. Sprawdź jakość zdjęcia.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={reset} className="flex-1">Spróbuj ponownie</Button>
                <Button onClick={handleApply} disabled={!result.amount && !result.date} className="flex-1">
                  Wczytaj do formularza
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
