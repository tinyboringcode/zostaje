"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category?: {
    id: string;
    name: string;
    emoji: string;
  };
}

interface TransactionsResponse {
  items: Transaction[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);

const getDateGroupLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toLocaleDateString() === today.toLocaleDateString()) return "dziś";
  if (date.toLocaleDateString() === yesterday.toLocaleDateString()) return "wczoraj";
  return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
};

interface GroupedTransactions {
  label: string;
  items: Transaction[];
}

const groupByDate = (transactions: Transaction[]): GroupedTransactions[] => {
  const groups: Map<string, Transaction[]> = new Map();
  for (const tx of transactions) {
    const label = getDateGroupLabel(tx.date);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
};

export function MobileTransactions() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<TransactionsResponse>({
    queryKey: ["transactions", { limit: 30, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "30",
        sortBy: "date",
        sortDir: "desc",
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const transactions = data?.items ?? [];
  const grouped = groupByDate(transactions);

  return (
    <div
      style={{
        minHeight: "100dvh",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Search input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          zIndex: 10,
        }}
      >
        <Search
          size={16}
          strokeWidth={1.5}
          style={{ color: "var(--text-3)", flexShrink: 0 }}
        />
        <input
          type="text"
          placeholder="szukaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-1)",
            width: "100%",
          }}
        />
      </div>

      {/* Spinner */}
      {isLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 20px",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Ładowanie...
          </span>
        </div>
      )}

      {/* Pusta lista */}
      {!isLoading && transactions.length === 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 20px",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {search ? "Brak wyników" : "Brak transakcji"}
          </span>
        </div>
      )}

      {/* Grouped list */}
      {!isLoading &&
        grouped.map((group) => (
          <div key={group.label}>
            {/* Nagłówek grupy */}
            <div
              style={{
                padding: "8px 20px",
                fontSize: 11,
                color: "var(--text-3)",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "var(--bg)",
              }}
            >
              {group.label}
            </div>

            {/* Transakcje w grupie */}
            {group.items.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Lewa kolumna */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    flex: 1,
                    overflow: "hidden",
                    marginRight: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text-1)",
                      fontFamily: "var(--font-sans)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.description || "—"}
                  </span>
                  {tx.category && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {tx.category.emoji} {tx.category.name}
                    </span>
                  )}
                </div>

                {/* Prawa kolumna */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 2,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      color:
                        tx.type === "INCOME" ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {tx.type === "INCOME" ? "+" : "−"}
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatShortDate(tx.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
