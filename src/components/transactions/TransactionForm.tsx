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

  const [form, setForm] = useState({
    type: "EXPENSE",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    contractor: "",
    contractorId: "",
    invoiceId: "",
    categoryId: "",
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
      });
      setContractorSearch("");
    }
  }, [editTx, open]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edytuj transakcję" : "Dodaj transakcję"}</DialogTitle>
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
              <Label>Kwota (PLN)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
  );
}
