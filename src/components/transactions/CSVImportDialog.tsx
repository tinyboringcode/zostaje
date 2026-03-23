"use client";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface Category {
  id: string;
  name: string;
  emoji: string;
  type: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}

export function CSVImportDialog({ open, onClose, categories }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file || !categoryId) throw new Error("Wybierz plik i kategorię");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categoryId", categoryId);
      const res = await fetch("/api/transactions/import", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Błąd importu");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Zaimportowano ${data.imported} transakcji`);
      setFile(null);
      setCategoryId("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Obsługiwane formaty: PKO BP, mBank, Santander, ING. Kolumny: data, opis, kwota (separator ; lub ,).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Plik CSV</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Kliknij aby wybrać plik CSV</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Domyślna kategoria</Label>
            <p className="text-xs text-muted-foreground">Możesz zmienić kategorie po imporcie</p>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!file || !categoryId || mutation.isPending}
          >
            {mutation.isPending ? "Importuję..." : "Importuj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
