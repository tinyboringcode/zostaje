"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays } from "date-fns";

interface Contractor { id: string; name: string; nip: string; }

interface Invoice {
  id: string;
  number: string;
  amount: number;
  netAmount: number;
  vatRate: number;
  currency: string;
  description: string;
  issueDate: string;
  dueDate: string;
  status: string;
  notes: string;
  template: string;
  contractor: Contractor;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editInvoice: Invoice | null;
}

const VAT_RATES = [
  { value: "23", label: "23% (podstawowa)" },
  { value: "8", label: "8% (obniżona)" },
  { value: "5", label: "5% (obniżona)" },
  { value: "0", label: "0% (eksport/WDT)" },
  { value: "-1", label: "ZW (zwolnione)" },
];

const CURRENCIES = ["PLN", "EUR", "USD", "GBP", "CHF"];
const TEMPLATES = [
  { value: "standard", label: "Faktura VAT" },
  { value: "proforma", label: "Proforma" },
  { value: "correction", label: "Faktura korygująca" },
];

const today = format(new Date(), "yyyy-MM-dd");
const in14 = format(addDays(new Date(), 14), "yyyy-MM-dd");

const DEFAULT_FORM = {
  contractorId: "",
  amount: "",
  vatRate: "23",
  currency: "PLN",
  currencyRate: "",
  description: "",
  issueDate: today,
  dueDate: in14,
  template: "standard",
  notes: "",
  status: "pending",
};

export function InvoiceForm({ open, onClose, editInvoice }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editInvoice;
  const [form, setForm] = useState(DEFAULT_FORM);
  const [contractorSearch, setContractorSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [nbpLoading, setNbpLoading] = useState(false);

  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ["contractors"],
    queryFn: () => fetch("/api/contractors").then((r) => r.json()),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    if (editInvoice) {
      const ct = editInvoice.contractor;
      setForm({
        contractorId: ct.id,
        amount: String(editInvoice.amount),
        vatRate: String(editInvoice.vatRate),
        currency: editInvoice.currency,
        currencyRate: "",
        description: editInvoice.description,
        issueDate: format(new Date(editInvoice.issueDate), "yyyy-MM-dd"),
        dueDate: format(new Date(editInvoice.dueDate), "yyyy-MM-dd"),
        template: editInvoice.template,
        notes: editInvoice.notes,
        status: editInvoice.status,
      });
      setContractorSearch(ct.name);
    } else {
      setForm({ ...DEFAULT_FORM, issueDate: format(new Date(), "yyyy-MM-dd"), dueDate: format(addDays(new Date(), 14), "yyyy-MM-dd") });
      setContractorSearch("");
    }
  }, [open, editInvoice]);

  const filteredContractors = contractorSearch.trim()
    ? contractors.filter((c) => c.name.toLowerCase().includes(contractorSearch.toLowerCase()) || c.nip.includes(contractorSearch))
    : contractors.slice(0, 8);

  const selectedContractor = contractors.find((c) => c.id === form.contractorId);

  // Oblicz kwoty podglądowo
  const gross = parseFloat(form.amount) || 0;
  const vatRate = parseInt(form.vatRate);
  const net = vatRate < 0 ? gross : gross / (1 + vatRate / 100);
  const vat = gross - net;

  const fetchNbpRate = async (currency: string) => {
    if (currency === "PLN") { setForm((f) => ({ ...f, currencyRate: "" })); return; }
    setNbpLoading(true);
    try {
      const res = await fetch(`/api/nbp?currency=${currency}&date=${form.issueDate}`);
      const data = await res.json();
      if (data.rate) setForm((f) => ({ ...f, currencyRate: String(data.rate) }));
    } catch { /* ignore */ } finally { setNbpLoading(false); }
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = isEdit ? `/api/faktury/${editInvoice!.id}` : "/api/faktury";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        contractorId: data.contractorId,
        amount: parseFloat(data.amount),
        vatRate: parseInt(data.vatRate),
        currency: data.currency,
        description: data.description,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        template: data.template,
        notes: data.notes,
        status: data.status,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktury"] });
      toast.success(isEdit ? "Faktura zaktualizowana" : "Faktura wystawiona");
      onClose();
    },
    onError: () => toast.error("Nie udało się zapisać faktury"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contractorId) { toast.error("Wybierz kontrahenta"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Podaj kwotę brutto"); return; }
    mutation.mutate(form);
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edytuj ${editInvoice?.number}` : "Nowa faktura"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">

          {/* Typ dokumentu */}
          <div className="space-y-1">
            <Label>Typ dokumentu</Label>
            <Select value={form.template} onValueChange={set("template")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Kontrahent */}
          <div className="space-y-1">
            <Label>Kontrahent *</Label>
            <div className="relative">
              <Input
                placeholder="Szukaj kontrahenta..."
                value={contractorSearch}
                onChange={(e) => { setContractorSearch(e.target.value); setShowDrop(true); if (!e.target.value) setForm((f) => ({ ...f, contractorId: "" })); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              />
              {showDrop && filteredContractors.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                  {filteredContractors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onMouseDown={() => { setForm((f) => ({ ...f, contractorId: c.id })); setContractorSearch(c.name); setShowDrop(false); }}
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.nip && <div className="text-xs text-muted-foreground">NIP: {c.nip}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedContractor && <p className="text-xs text-green-600">✓ {selectedContractor.name}</p>}
          </div>

          {/* Opis */}
          <div className="space-y-1">
            <Label>Opis usługi / towaru *</Label>
            <Input
              required
              placeholder="np. Usługi programistyczne — kwiecień 2026"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Kwota + VAT */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kwota brutto *</Label>
              <Input
                type="number" step="0.01" min="0.01" required
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
              {gross > 0 && (
                <p className="text-xs text-muted-foreground">
                  Netto: {net.toFixed(2)} · VAT: {vat.toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Stawka VAT</Label>
              <Select value={form.vatRate} onValueChange={set("vatRate")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Waluta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Waluta</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => { set("currency")(v); fetchNbpRate(v); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.currency !== "PLN" && (
              <div className="space-y-1">
                <Label>Kurs NBP {nbpLoading ? "(pobieranie...)" : ""}</Label>
                <Input
                  type="number" step="0.0001" min="0"
                  placeholder="np. 4.2841"
                  value={form.currencyRate}
                  onChange={(e) => setForm((f) => ({ ...f, currencyRate: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Daty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data wystawienia</Label>
              <Input type="date" required value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Termin płatności</Label>
              <Input type="date" required value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Oczekuje</SelectItem>
                  <SelectItem value="paid">Opłacona</SelectItem>
                  <SelectItem value="overdue">Po terminie</SelectItem>
                  <SelectItem value="cancelled">Anulowana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Uwagi */}
          <div className="space-y-1">
            <Label>Uwagi (opcjonalnie)</Label>
            <Input
              placeholder="Dodatkowe informacje na fakturze..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Zapisuję..." : isEdit ? "Zapisz zmiany" : "Wystaw fakturę"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
