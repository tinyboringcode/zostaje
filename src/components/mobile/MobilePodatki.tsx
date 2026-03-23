"use client";

import { useQuery } from "@tanstack/react-query";

interface WidgetsData {
  totalMonthlyBurden: number;
  daysToZus: number;
  zusSpołeczny?: number;
  zusZdrowotny?: number;
  pitZaliczka?: number;
}

interface TaxData {
  zusSpołeczny?: number;
  zusZdrowotny?: number;
  pitZaliczka?: number;
  totalMonthlyBurden?: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);

const getCurrentMonthParam = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export function MobilePodatki() {
  const { data: widgets, isLoading: widgetsLoading } = useQuery<WidgetsData>({
    queryKey: ["widgets"],
    queryFn: async () => {
      const res = await fetch("/api/widgets");
      if (!res.ok) throw new Error("Failed to fetch widgets");
      return res.json();
    },
  });

  const { data: taxData, isLoading: taxLoading } = useQuery<TaxData>({
    queryKey: ["taxes", getCurrentMonthParam()],
    queryFn: async () => {
      const res = await fetch(`/api/taxes?month=${getCurrentMonthParam()}`);
      if (!res.ok) return {};
      return res.json();
    },
  });

  const daysToZus = widgets?.daysToZus ?? 0;
  const totalMonthlyBurden =
    taxData?.totalMonthlyBurden ?? widgets?.totalMonthlyBurden ?? 0;

  const zusSpołeczny = taxData?.zusSpołeczny ?? widgets?.zusSpołeczny;
  const zusZdrowotny = taxData?.zusZdrowotny ?? widgets?.zusZdrowotny;
  const pitZaliczka = taxData?.pitZaliczka ?? widgets?.pitZaliczka;

  const hasBreakdown =
    zusSpołeczny !== undefined ||
    zusZdrowotny !== undefined ||
    pitZaliczka !== undefined;

  const isLoading = widgetsLoading || taxLoading;

  const lineStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "10px 0",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    color: "var(--text-2)",
    fontFamily: "var(--font-sans)",
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 14,
    color: "var(--amber)",
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "var(--font-sans)",
        minHeight: "100dvh",
      }}
    >
      {/* Nagłówek */}
      <p
        style={{
          fontSize: 11,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 28px 0",
          fontFamily: "var(--font-sans)",
        }}
      >
        podatki i ZUS
      </p>

      {/* ZUS countdown */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 48,
            fontWeight: 400,
            color: "var(--amber)",
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          {isLoading ? "—" : `za ${daysToZus} dni`}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            fontFamily: "var(--font-sans)",
            margin: 0,
          }}
        >
          do 20. miesiąca
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--border)",
          marginBottom: 16,
        }}
      />

      {/* Lista pozycji */}
      <div>
        {hasBreakdown ? (
          <>
            {zusSpołeczny !== undefined && (
              <div style={lineStyle}>
                <span style={labelStyle}>ZUS społeczny</span>
                <span style={valueStyle}>
                  {formatCurrency(zusSpołeczny)}
                </span>
              </div>
            )}
            {zusZdrowotny !== undefined && (
              <div style={lineStyle}>
                <span style={labelStyle}>ZUS zdrowotny</span>
                <span style={valueStyle}>
                  {formatCurrency(zusZdrowotny)}
                </span>
              </div>
            )}
            {pitZaliczka !== undefined && (
              <div style={lineStyle}>
                <span style={labelStyle}>PIT zaliczka</span>
                <span style={valueStyle}>
                  {formatCurrency(pitZaliczka)}
                </span>
              </div>
            )}

            {/* Separator */}
            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "8px 0",
              }}
            />

            {/* Razem */}
            <div style={lineStyle}>
              <span
                style={{
                  fontSize: 14,
                  color: "var(--text-1)",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                }}
              >
                Razem
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  color: "var(--text-1)",
                  fontWeight: 500,
                }}
              >
                {formatCurrency(totalMonthlyBurden)}
              </span>
            </div>
          </>
        ) : (
          /* Fallback — tylko totalMonthlyBurden */
          <div style={lineStyle}>
            <span style={labelStyle}>Szacowane obciążenie</span>
            <span style={valueStyle}>
              {isLoading ? "—" : formatCurrency(totalMonthlyBurden)}
            </span>
          </div>
        )}
      </div>

      {/* Note */}
      <p
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontFamily: "var(--font-sans)",
          textAlign: "center",
          marginTop: 32,
        }}
      >
        Płatność do 20. dnia każdego miesiąca
      </p>
    </div>
  );
}
