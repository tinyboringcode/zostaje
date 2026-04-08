"use client";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Camera } from "lucide-react";
import { ReceiptScanner } from "./ReceiptScanner";
import { computeGross, computeNet } from "@/lib/formatters";
import type { VatRate } from "@/lib/types";

const VAT_RATES: { value: string; label: string }[] = [
  { value: "none", label: "Bez VAT" },
  { value: "23", label: "23%" },
  { value: "8", label: "8%" },
  { value: "5", label: "5%" },
  { value: "0", label: "0%" },
  { value: "-1", label: "ZW" },
];

const CURRENCIES = ["PLN", "EUR", "USD", "GBP", "CHF"];

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: string;
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  contractor: string | null;
  contractorId: string | null;
  invoiceId: string | null;
  type: "INCOME" | "EXPENSE";
  category: Category;
}

interface ContractorOption {
  id: string;
  name: string;
  nip: string;
  unpaidAmount: number;
  overdueCount: number;
  invoices: {
    id: string;
    number: string;
    amount: number;
    status: string;
    dueDate: string;
    issueDate: string;
  }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  editTx: Transaction | null;
  categories: Category[];
}

export function TransactionForm({ open, onClose, editTx, categories }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editTx;
  const [suggestion, setSuggestion] = useState<{ categoryId: string; confidence: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contractorSearch, setContractorSearch] = useState("");
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const contractorRef = useRef<HTMLDivElement>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [nbpLoading, setNbpLoading] = useState(false);

  const [amountMode, setAmountMode] = useState<"net" | "gross">("gross");

  const [form, setForm] = useState({
    type: "EXPENSE",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    contractor: "",
    contractorId: "",
    invoiceId: "",
    categoryId: "",
    currency: "PLN",
    originalAmount: "",
    currencyRate: "",
    vatRate: "none" as string,
    amountNet: "",
    amountGross: "",
    vatAmount: "",
  });

  // Fetch contractors list
  const { data: contractorsData } = useQuery<ContractorOption[]>({
    queryKey: ["contractors"],
    queryFn: () => fetch("/api/contractors").then((r) => r.json()),
    staleTime: 60_000,
  });
  const contractors = contractorsData ?? [];

  // Unpaid invoices for the selected contractor
  const selectedContractor = form.contractorId
    ? contractors.find((c) => c.id === form.contractorId) ?? null
    : null;

  const unpaidInvoices = selectedContractor
    ? selectedContractor.invoices.filter((i) => i.status !== "paid")
    : [];

  // Close contractor dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contractorRef.current && !contractorRef.current.contains(e.target as Node)) {
        setShowContractorDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (editTx) {
      const ctxName = contractors.find((c) => c.id === editTx.contractorId)?.name ?? editTx.contractor ?? "";
      setForm({
        type: editTx.type,
        amount: editTx.amount.toString(),
        date: format(new Date(editTx.date), "yyyy-MM-dd"),
        description: editTx.description,
        contractor: ctxName,
        contractorId: editTx.contractorId ?? "",
        invoiceId: editTx.invoiceId ?? "",
        categoryId: editTx.category.id,
        currency: "PLN",
        originalAmount: "",
        currencyRate: "",
        vatRate: "none",
        amountNet: "",
        amountGross: "",
        vatAmount: "",
      });
      setContractorSearch(ctxName);
    } else {
      setForm({
        type: "EXPENSE",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        contractor: "",
        contractorId: "",
        invoiceId: "",
        categoryId: "",
        currency: "PLN",
        originalAmount: "",
        currencyRate: "",
        vatRate: "none",
        amountNet: "",
        amountGross: "",
        vatAmount: "",
      });
      setContractorSearch("");
    }
  }, [editTx, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNbpRate = async (currency: string, date: string) => {
    if (currency === "PLN") return;
    setNbpLoading(true);
    try {
      const res = await fetch(`/api/nbp?currency=${currency}&date=${date}`);
      const data = await res.json();
      if (data.rate) {
        setForm((f) => ({ ...f, currencyRate: String(data.rate) }));
      }
    } catch { /* ignore */ } finally { setNbpLoading(false); }
  };

  const recalcVat = (amount: string, rate: string, mode: "net" | "gross") => {
    if (!amount || rate === "none") return { amountNet: "", amountGross: "", vatAmount: "" };
    const num = parseFloat(amount);
    if (isNaN(num)) return { amountNet: "", amountGross: "", vatAmount: "" };
    const r = parseInt(rate) as VatRate;
    if (mode === "net") {
      const { gross, vat } = computeGross(num, r);
      return { amountNet: amount, amountGross: gross.toFixed(2), vatAmount: vat.toFixed(2) };
    }
    const { net, vat } = computeNet(num, r);
    return { amountNet: net.toFixed(2), amountGross: amount, vatAmount: vat.toFixed(2) };
  };

  const handleVatRateChange = (rate: string) => {
    const calc = recalcVat(form.amount, rate, amountMode);
    setForm((f) => ({ ...f, vatRate: rate, ...calc }));
  };

  const handleAmountChange = (val: string) => {
    const calc = recalcVat(val, form.vatRate, amountMode);
    setForm((f) => ({ ...f, amount: val, ...calc }));
  };

  const toggleAmountMode = () => {
    const next = amountMode === "net" ? "gross" : "net";
    setAmountMode(next);
    const calc = recalcVat(form.amount, form.vatRate, next);
    setForm((f) => ({ ...f, ...calc }));
  };

  const handleCurrencyChange = (currency: string) => {
    setForm((f) => ({ ...f, currency }));
    if (currency !== "PLN") fetchNbpRate(currency, form.date);
    else setForm((f) => ({ ...f, currencyRate: "", originalAmount: "" }));
  };

  const handleScanApply = (data: { amount?: string; date?: string; description?: string }) => {
    setForm((f) => ({
      ...f,
      ...(data.amount && { amount: data.amount }),
      ...(data.date && { date: data.date }),
      ...(data.description && { description: data.description }),
    }));
  };

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const filteredContractors = contractorSearch.trim().length > 0
    ? contractors.filter((c) =>
        c.name.toLowerCase().includes(contractorSearch.toLowerCase()) ||
        c.nip.includes(contractorSearch)
      )
    : contractors.slice(0, 8);

  // Debounced AI category suggestion
  const handleDescriptionChange = (val: string) => {
    setForm((f) => ({ ...f, description: val }));
    if (isEdit) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 4) { setSuggestion(null); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/categorize?q=${encodeURIComponent(val)}&type=${form.type}`);
      const data = await res.json();
      setSuggestion(data.suggestion ?? null);
    }, 600);
  };

  const selectContractor = (c: ContractorOption) => {
    setForm((f) => ({ ...f, contractorId: c.id, contractor: c.name, invoiceId: "" }));
    setContractorSearch(c.name);
    setShowContractorDropdown(false);
  };

  const clearContractor = () => {
    setForm((f) => ({ ...f, contractorId: "", contractor: "", invoiceId: "" }));
    setContractorSearch("");
  };

  const applySuggestion = () => {
    if (suggestion) setForm((f) => ({ ...f, categoryId: suggestion.categoryId }));
    setSuggestion(null);
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = isEdit ? `/api/transactions/${editTx!.id}` : "/api/transactions";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          contractorId: data.contractorId || null,
          invoiceId: data.invoiceId || null,
        }),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["widgets"] });
      qc.invalidateQueries({ queryKey: ["contractors"] });
      toast.success(isEdit ? "Transakcja zaktualizowana" : "Transakcja dodana");
      onClose();
    },
    onError: () => toast.error("Nie udało się zapisać transakcji"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) { toast.error("Wybierz kategorię"); return; }
    mutation.mutate(form);
  };

  return (
    <>
    <ReceiptScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onApply={handleScanApply} />
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? "Edytuj transakcję" : "Dodaj transakcję"}</DialogTitle>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Skanuj paragon"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors text-muted-foreground"
              >
                <Camera className="h-3.5 w-3.5" />
                Skanuj paragon
              </button>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-md overflow-hidden border">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t, categoryId: "" }))}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.type === t
                    ? t === "INCOME"
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                    : "hover:bg-muted"
                }`}
              >
                {t === "INCOME" ? "Przychód" : "Wydatek"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Kwota {form.vatRate !== "none" ? (amountMode === "net" ? "(netto)" : "(brutto)") : ""}</Label>
                {form.vatRate !== "none" && (
                  <button
                    type="button"
                    onClick={toggleAmountMode}
                    className="text-[10px] uppercase tracking-wide text-primary hover:underline"
                  >
                    {amountMode === "net" ? "Wpisz brutto" : "Wpisz netto"}
                  </button>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          {/* Stawka VAT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Stawka VAT</Label>
              <Select value={form.vatRate} onValueChange={handleVatRateChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.vatRate !== "none" && form.amountNet && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Podsumowanie VAT</Label>
                <div className="text-xs space-y-0.5 pt-2" style={{ color: "var(--text-2)" }}>
                  <div className="flex justify-between">
                    <span>Netto:</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{parseFloat(form.amountNet).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} {form.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({form.vatRate === "-1" ? "ZW" : form.vatRate + "%"}):</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{parseFloat(form.vatAmount || "0").toLocaleString("pl-PL", { minimumFractionDigits: 2 })} {form.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium" style={{ color: "var(--text-1)" }}>
                    <span>Brutto:</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{parseFloat(form.amountGross).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} {form.currency}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Waluta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Waluta</Label>
              <Select value={form.currency} onValueChange={handleCurrencyChange}>
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
                {form.amount && form.currencyRate && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {(parseFloat(form.amount) * parseFloat(form.currencyRate)).toFixed(2)} PLN
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Opis</Label>
            <Input
              required
              placeholder="np. Faktura za hosting"
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />
            {suggestion && !form.categoryId && (() => {
              const cat = filteredCategories.find((c) => c.id === suggestion.categoryId);
              return cat ? (
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <span>Sugestia AI:</span>
                  <span className="font-medium">{cat.emoji} {cat.name}</span>
                  <span className="opacity-60">({Math.round(suggestion.confidence * 100)}%)</span>
                </button>
              ) : null;
            })()}
          </div>

          {/* Contractor picker */}
          <div className="space-y-1" ref={contractorRef}>
            <Label>Kontrahent (opcjonalnie)</Label>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <Input
                  placeholder="Szukaj kontrahenta..."
                  value={contractorSearch}
                  onChange={(e) => {
                    setContractorSearch(e.target.value);
                    if (!form.contractorId) setShowContractorDropdown(true);
                    if (e.target.value === "") clearContractor();
                  }}
                  onFocus={() => setShowContractorDropdown(true)}
                  style={{ flex: 1 }}
                />
                {form.contractorId && (
                  <button
                    type="button"
                    onClick={clearContractor}
                    style={{ padding: "0 10px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)", fontSize: 12, color: "var(--text-3)", cursor: "pointer", flexShrink: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showContractorDropdown && filteredContractors.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 4, boxShadow: "var(--shadow)", zIndex: 50,
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {filteredContractors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => selectContractor(c)}
                      style={{
                        width: "100%", textAlign: "left", padding: "8px 12px",
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        fontSize: 13, fontFamily: "var(--font-sans)",
                        borderBottom: "1px solid var(--border)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ color: "var(--text-1)" }}>{c.name}</span>
                      {c.unpaidAmount > 0 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: c.overdueCount > 0 ? "var(--red)" : "var(--amber)" }}>
                          {c.unpaidAmount.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł oczekuje
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unpaid invoices for selected contractor */}
            {selectedContractor && unpaidInvoices.length > 0 && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Niezapłacone faktury — {selectedContractor.name}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {unpaidInvoices.map((inv) => {
                    const isLinked = form.invoiceId === inv.id;
                    const isOverdue = inv.status === "overdue";
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, invoiceId: isLinked ? "" : inv.id }))}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "6px 10px", border: `1px solid ${isLinked ? "var(--text-1)" : "var(--border)"}`,
                          borderRadius: 4, background: isLinked ? "var(--surface2)" : "var(--bg)",
                          cursor: "pointer", width: "100%", textAlign: "left",
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {isLinked && <span style={{ fontSize: 10, color: "var(--green)" }}>✓</span>}
                          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>{inv.number}</span>
                          <span style={{ fontSize: 11, color: isOverdue ? "var(--red)" : "var(--amber)", fontFamily: "var(--font-sans)" }}>
                            {isOverdue ? "po terminie" : "oczekuje"}
                          </span>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                          {inv.amount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                        </span>
                      </button>
                    );
                  })}
                </div>
                {form.invoiceId && (
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--green)", fontFamily: "var(--font-sans)" }}>
                    Faktura zostanie oznaczona jako zapłacona po zapisaniu transakcji.
                  </p>
                )}
              </div>
            )}

            {selectedContractor && unpaidInvoices.length === 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--green)", fontFamily: "var(--font-sans)" }}>
                Brak niezapłaconych faktur dla tego kontrahenta.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Kategoria</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Zapisuję..." : isEdit ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
