"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  emoji: string;
  type: "INCOME" | "EXPENSE";
}

interface ContractorInvoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  dueDate: string;
}

interface Contractor {
  id: string;
  name: string;
  unpaidAmount: number;
  overdueCount: number;
  invoices: ContractorInvoice[];
}

export function MobileAdd() {
  const router = useRouter();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [showContractors, setShowContractors] = useState(false);
  const [contractorSearch, setContractorSearch] = useState("");

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const { data: contractorsData } = useQuery<Contractor[]>({
    queryKey: ["contractors"],
    queryFn: () => fetch("/api/contractors").then((r) => r.json()),
    staleTime: 60_000,
  });

  const categories: Category[] = categoriesData ?? [];
  const contractors: Contractor[] = contractorsData ?? [];
  const filteredCategories = categories.filter((c) => c.type === type);

  const selectedContractor = contractors.find((c) => c.id === contractorId) ?? null;
  const unpaidInvoices = selectedContractor ? selectedContractor.invoices.filter((i) => i.status !== "paid") : [];

  const filteredContractors = contractorSearch.trim()
    ? contractors.filter((c) => c.name.toLowerCase().includes(contractorSearch.toLowerCase()))
    : contractors;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type,
          categoryId,
          description: description || filteredCategories.find((c) => c.id === categoryId)?.name || "",
          date: new Date().toISOString().slice(0, 10),
          contractorId: contractorId || null,
          invoiceId: invoiceId || null,
        }),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["widgets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contractors"] });
      router.push("/m/");
    },
  });

  const handleTypeChange = (t: "INCOME" | "EXPENSE") => {
    setType(t);
    setCategoryId("");
  };

  const canSave = amount !== "" && parseFloat(amount) > 0 && categoryId !== "" && !mutation.isPending;
  const amountNum = parseFloat(amount) || 0;

  return (
    <div style={{ padding: "24px 20px", minHeight: "100dvh", display: "flex", flexDirection: "column", gap: 20, background: "var(--bg)" }}>

      {/* Header */}
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        dodaj transakcję
      </p>

      {/* Amount input */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 52,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            textAlign: "center",
            background: "transparent",
            border: "none",
            outline: "none",
            color: type === "INCOME" ? "var(--green)" : "var(--red)",
            width: "100%",
          }}
        />
        {amountNum > 0 && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-3)" }}>
            {type === "INCOME" ? "+" : "−"}{amountNum.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
          </span>
        )}
      </div>

      {/* Type toggle */}
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {(["INCOME", "EXPENSE"] as const).map((t) => {
          const active = type === t;
          const color = t === "INCOME" ? "var(--green)" : "var(--red)";
          return (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              style={{
                flex: 1,
                padding: "13px 0",
                border: "none",
                background: active ? color : "var(--bg)",
                color: active ? "#fff" : "var(--text-3)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                letterSpacing: "0.01em",
                transition: "all 150ms",
              }}
            >
              {t === "INCOME" ? "Przychód" : "Wydatek"}
            </button>
          );
        })}
      </div>

      {/* Category grid */}
      <div>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Kategoria
        </p>
        {filteredCategories.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>Brak kategorii dla tego typu</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {filteredCategories.map((cat) => {
              const active = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    aspectRatio: "1/1",
                    border: `1.5px solid ${active ? "var(--text-1)" : "var(--border)"}`,
                    borderRadius: 12,
                    background: active ? "var(--surface)" : "var(--bg)",
                    cursor: "pointer",
                    padding: 6,
                    transition: "all 150ms",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 10, color: active ? "var(--text-1)" : "var(--text-3)", fontFamily: "var(--font-sans)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Description */}
      <input
        type="text"
        placeholder="opis (opcjonalnie)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ border: "none", borderBottom: "1px solid var(--border)", background: "transparent", outline: "none", padding: "10px 0", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-1)", width: "100%" }}
      />

      {/* Contractor section */}
      <div>
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Kontrahent (opcjonalnie)
        </p>

        {!selectedContractor ? (
          <>
            <button
              onClick={() => setShowContractors((v) => !v)}
              style={{
                width: "100%", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--bg)", fontFamily: "var(--font-sans)", fontSize: 13,
                color: "var(--text-3)", textAlign: "left", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <span>wybierz kontrahenta...</span>
              <span style={{ fontSize: 10 }}>{showContractors ? "▲" : "▼"}</span>
            </button>

            {showContractors && (
              <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <input
                  type="text"
                  placeholder="szukaj..."
                  value={contractorSearch}
                  onChange={(e) => setContractorSearch(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "none", borderBottom: "1px solid var(--border)", outline: "none", fontFamily: "var(--font-sans)", fontSize: 13, background: "var(--surface)" }}
                  autoFocus
                />
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {filteredContractors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setContractorId(c.id); setInvoiceId(""); setShowContractors(false); setContractorSearch(""); }}
                      style={{
                        width: "100%", padding: "12px 14px", border: "none", borderBottom: "1px solid var(--border)",
                        background: "var(--bg)", display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                      }}
                    >
                      <span style={{ fontSize: 14, color: "var(--text-1)" }}>{c.name}</span>
                      {c.unpaidAmount > 0 && (
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: c.overdueCount > 0 ? "var(--red)" : "var(--amber)" }}>
                          {c.unpaidAmount.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredContractors.length === 0 && (
                    <p style={{ padding: "12px 14px", margin: 0, fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>Brak wyników</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {/* Selected contractor header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface)", borderBottom: unpaidInvoices.length > 0 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-1)", fontWeight: 500 }}>
                {selectedContractor.name}
              </span>
              <button
                onClick={() => { setContractorId(""); setInvoiceId(""); }}
                style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
              >
                zmień
              </button>
            </div>

            {/* Unpaid invoices */}
            {unpaidInvoices.length > 0 && (
              <div style={{ padding: "10px 14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Niezapłacone faktury
                </p>
                {unpaidInvoices.map((inv) => {
                  const isLinked = invoiceId === inv.id;
                  const isOverdue = inv.status === "overdue";
                  return (
                    <button
                      key={inv.id}
                      onClick={() => setInvoiceId(isLinked ? "" : inv.id)}
                      style={{
                        width: "100%", marginBottom: 6, padding: "10px 12px",
                        border: `1.5px solid ${isLinked ? "var(--text-1)" : "var(--border)"}`,
                        borderRadius: 8, background: isLinked ? "var(--surface2)" : "var(--bg)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 14 }}>{isLinked ? "✓" : (isOverdue ? "⚠️" : "📄")}</span>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>{inv.number}</div>
                          <div style={{ fontSize: 11, color: isOverdue ? "var(--red)" : "var(--amber)", fontFamily: "var(--font-sans)" }}>
                            {isOverdue ? "po terminie" : "oczekuje"}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-1)" }}>
                        {inv.amount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                      </span>
                    </button>
                  );
                })}
                {invoiceId && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--green)", fontFamily: "var(--font-sans)" }}>
                    Faktura zostanie oznaczona jako zapłacona.
                  </p>
                )}
              </div>
            )}

            {unpaidInvoices.length === 0 && (
              <p style={{ margin: 0, padding: "10px 14px", fontSize: 12, color: "var(--green)", fontFamily: "var(--font-sans)" }}>
                Wszystkie faktury zapłacone ✓
              </p>
            )}
          </div>
        )}
      </div>

      {mutation.isError && (
        <p style={{ fontSize: 12, color: "var(--red)", fontFamily: "var(--font-sans)", margin: 0 }}>
          Nie udało się zapisać
        </p>
      )}

      <div style={{ flex: 1 }} />

      {/* Save button */}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSave}
        style={{
          width: "100%",
          height: 54,
          background: canSave ? "var(--text-1)" : "var(--surface2)",
          color: canSave ? "var(--bg)" : "var(--text-3)",
          border: "none",
          borderRadius: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          cursor: canSave ? "pointer" : "not-allowed",
          transition: "all 150ms",
        }}
      >
        {mutation.isPending ? "zapisuję..." : "zapisz"}
      </button>
    </div>
  );
}
