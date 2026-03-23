"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardBody, Chip, Button, Spinner } from "@heroui/react";
import { formatCurrency } from "@/lib/formatters";
import {
  Clock, AlertTriangle, CheckCircle2, Calendar, Calculator,
  TrendingUp, Building2, Zap, ChevronRight,
} from "lucide-react";
import type { AnnualSimResult } from "@/lib/tax-calculator";

interface TaxData {
  month: string; taxForm: string; zusStage: string; ryczaltRate: number;
  ytdRevenue: number; ytdCosts: number; ytdProfit: number;
  monthlyRevenue: number; monthlyIncome: number;
  zusSocial: { emerytalne: number; rentowe: number; chorobowe: number; wypadkowe: number; fp: number; total: number; monthly: number; ytd: number; base: number };
  health: { monthly: number; ytd: number };
  pit: { advance: number; ytdTax: number; taxBase: number; effectiveRate: number };
  totalMonthlyBurden: number;
  obligations: Array<{ title: string; dueDay: number; dueDate: string; daysUntil: number; amount?: number; description: string; urgent: boolean; transferTitle?: string }>;
  zusProgress: { stage: string; monthsIn: number; monthsRemaining: number; nextStage: string } | null;
  isVatPayer: boolean; vatPeriod: string; nip: string; currency: string;
}

const TAX_FORM_LABELS: Record<string, string> = {
  tax_scale: "Skala (12%/32%)",
  linear: "Liniowy 19%",
  flat_rate: "Ryczałt",
};

const ZUS_STAGE_LABELS: Record<string, { label: string; color: "success" | "primary" | "warning" | "danger" }> = {
  ulga_na_start: { label: "Ulga na start", color: "success" },
  maly_zus: { label: "Mały ZUS", color: "primary" },
  maly_zus_plus: { label: "Mały ZUS Plus", color: "warning" },
  full: { label: "Pełny ZUS", color: "danger" },
};

function ObligationCard({ ob }: { ob: TaxData["obligations"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const color = ob.urgent ? "danger" : ob.daysUntil <= 10 ? "warning" : "default";
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        ob.urgent ? "border-danger/40 bg-danger/5" : ob.daysUntil <= 10 ? "border-warning/40 bg-warning/5" : "border-default-100"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {ob.urgent ? <AlertTriangle className="h-4 w-4 text-danger shrink-0" /> : <Calendar className="h-4 w-4 text-default-400 shrink-0" />}
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{ob.title}</div>
            <div className="text-xs text-default-500">{ob.description}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <Chip size="sm" color={color} variant="flat">
            {ob.daysUntil <= 0 ? "Dziś!" : ob.daysUntil === 1 ? "Jutro" : `${ob.daysUntil} dni`}
          </Chip>
          {ob.amount != null && (
            <div className="text-xs font-bold mt-0.5 text-default-600">{formatCurrency(ob.amount)}</div>
          )}
        </div>
        <ChevronRight className={`h-4 w-4 text-default-400 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>
      {expanded && ob.transferTitle && (
        <div className="mt-3 pt-3 border-t border-default-100">
          <div className="text-xs text-default-400 mb-1">Tytuł przelewu:</div>
          <div className="font-mono text-xs bg-default-50 px-3 py-2 rounded-lg break-all">{ob.transferTitle}</div>
          <div className="text-xs text-default-400 mt-2">Termin: {new Date(ob.dueDate).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      )}
    </div>
  );
}

export function TaxesClient() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month] = useState(currentMonth);

  // Simulator state
  const [simRevenue, setSimRevenue] = useState(120000);
  const [simCosts, setSimCosts] = useState(30000);
  const [simRyczalt, setSimRyczalt] = useState(12);
  const [simResults, setSimResults] = useState<AnnualSimResult[] | null>(null);

  const { data, isLoading } = useQuery<TaxData>({
    queryKey: ["taxes", month],
    queryFn: () => fetch(`/api/taxes?month=${month}`).then((r) => r.json()),
  });

  const simulateMutation = useMutation({
    mutationFn: () => fetch("/api/taxes/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annualRevenue: simRevenue, annualCosts: simCosts, ryczaltRate: simRyczalt }),
    }).then((r) => r.json()),
    onSuccess: (d) => setSimResults(d.results),
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-24"><Spinner size="lg" color="primary" label="Obliczam zobowiązania..." /></div>;
  }

  const zusInfo = ZUS_STAGE_LABELS[data.zusStage] ?? { label: data.zusStage, color: "default" as const };
  const bestForm = simResults ? simResults.reduce((best, r) => r.netIncome > best.netIncome ? r : best) : null;

  return (
    <div className="space-y-8 max-w-5xl animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Podatki i ZUS</h1>
          <p className="text-default-500 text-sm mt-1">Kalkulacje, zobowiązania i symulator form opodatkowania</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip color={zusInfo.color} variant="flat" startContent={<Building2 className="h-3.5 w-3.5" />}>
            {zusInfo.label}
          </Chip>
          <Chip color="primary" variant="flat" startContent={<Calculator className="h-3.5 w-3.5" />}>
            {TAX_FORM_LABELS[data.taxForm] ?? data.taxForm}
          </Chip>
          {data.isVatPayer && <Chip color="secondary" variant="flat">VAT-owiec</Chip>}
        </div>
      </div>

      {/* Monthly obligations calendar */}
      <section>
        <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Najbliższe zobowiązania</div>
        {data.obligations.length === 0 ? (
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-6 text-center text-default-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm">Brak zobowiązań w najbliższym czasie</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.obligations.map((ob, i) => <ObligationCard key={i} ob={ob} />)}
          </div>
        )}
      </section>

      {/* ZUS stage progress */}
      {data.zusProgress && (
        <Card className="glass border-0 bg-gradient-to-br from-primary/5 to-violet-500/5" shadow="none">
          <CardBody className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div className="font-semibold text-sm">Postęp preferencji ZUS</div>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-default-600">{ZUS_STAGE_LABELS[data.zusProgress.stage]?.label}</span>
              <span className="font-semibold">{data.zusProgress.monthsIn} / {data.zusProgress.monthsIn + data.zusProgress.monthsRemaining} mies.</span>
            </div>
            <div className="h-2 bg-default-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
                style={{ width: `${(data.zusProgress.monthsIn / (data.zusProgress.monthsIn + data.zusProgress.monthsRemaining)) * 100}%` }}
              />
            </div>
            <div className="text-xs text-default-400 mt-2">
              Za {data.zusProgress.monthsRemaining} mies. przechodzisz na: <strong>{data.zusProgress.nextStage}</strong>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Monthly breakdown */}
      <section>
        <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Bieżący rok — narastająco</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Przychód YTD", value: data.ytdRevenue, color: "text-success" },
            { label: "Koszty YTD", value: data.ytdCosts, color: "text-danger" },
            { label: "Zysk YTD", value: data.ytdProfit, color: data.ytdProfit >= 0 ? "text-success" : "text-danger" },
            { label: "Podatek YTD", value: data.pit.ytdTax, color: "text-warning-700 dark:text-warning-400" },
          ].map((kpi) => (
            <Card key={kpi.label} className="glass border-0 glow-hover" shadow="none">
              <CardBody className="p-5">
                <div className="text-xs text-default-400 uppercase tracking-widest mb-1">{kpi.label}</div>
                <div className={`text-2xl font-bold ${kpi.color}`}>{formatCurrency(kpi.value)}</div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {/* ZUS breakdown */}
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-5">
              <div className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> ZUS miesięczny
              </div>
              {data.zusStage === "ulga_na_start" ? (
                <div className="text-sm text-success font-medium">Ulga na start — brak składek społecznych</div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {[
                    ["Emerytalne", data.zusSocial.emerytalne],
                    ["Rentowe", data.zusSocial.rentowe],
                    ["Chorobowe", data.zusSocial.chorobowe],
                    ["Wypadkowe", data.zusSocial.wypadkowe],
                    ...(data.zusSocial.fp > 0 ? [["Fundusz Pracy", data.zusSocial.fp] as [string, number]] : []),
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span className="text-default-500">{k}</span>
                      <span className="font-medium">{formatCurrency(v as number)}</span>
                    </div>
                  ))}
                  <div className="border-t border-default-100 pt-1.5 flex justify-between font-semibold">
                    <span>Łącznie social</span>
                    <span>{formatCurrency(data.zusSocial.monthly)}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span className="text-default-500">+ Zdrowotna</span>
                    <span className="font-semibold">{formatCurrency(data.health.monthly)}</span>
                  </div>
                  <div className="border-t border-default-100 pt-1.5 flex justify-between font-bold">
                    <span>Suma ZUS</span>
                    <span className="text-danger">{formatCurrency(data.zusSocial.monthly + data.health.monthly)}</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* PIT advance */}
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-5">
              <div className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-warning" />
                {TAX_FORM_LABELS[data.taxForm] ?? data.taxForm}
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-default-500">Podstawa</span><span>{formatCurrency(data.pit.taxBase)}</span></div>
                <div className="flex justify-between"><span className="text-default-500">Stawka efektywna</span><span>{data.pit.effectiveRate.toFixed(1)}%</span></div>
                <div className="border-t border-default-100 pt-1.5 flex justify-between font-bold">
                  <span>Zaliczka PIT</span>
                  <span className="text-warning-700 dark:text-warning-400">{formatCurrency(data.pit.advance)}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Total monthly burden */}
          <Card className="glass border-0 bg-gradient-to-br from-danger/5 to-rose-500/3" shadow="none">
            <CardBody className="p-5">
              <div className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-danger" /> Łączne obciążenie
              </div>
              <div className="text-3xl font-bold text-danger mb-1">{formatCurrency(data.totalMonthlyBurden)}</div>
              <div className="text-xs text-default-400">miesięcznie (ZUS + zdrowotna + PIT)</div>
              {data.monthlyRevenue > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-default-400">% przychodu: </span>
                  <span className="font-semibold">{Math.round((data.totalMonthlyBurden / data.monthlyRevenue) * 100)}%</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Tax form simulator */}
      <section>
        <div className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-3">Symulator form opodatkowania</div>
        <Card className="glass border-0" shadow="none">
          <CardBody className="p-5 space-y-4">
            <p className="text-sm text-default-500">
              Wpisz swoje roczne przychody i koszty, aby porównać ile zapłaciłbyś na każdej formie opodatkowania.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-default-500 block mb-1">Roczne przychody</label>
                <input
                  type="number"
                  value={simRevenue}
                  onChange={(e) => setSimRevenue(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-default-200 bg-background text-sm focus:outline-none focus:border-primary"
                  placeholder="120000"
                />
              </div>
              <div>
                <label className="text-xs text-default-500 block mb-1">Roczne koszty (liniowy/skala)</label>
                <input
                  type="number"
                  value={simCosts}
                  onChange={(e) => setSimCosts(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-default-200 bg-background text-sm focus:outline-none focus:border-primary"
                  placeholder="30000"
                />
              </div>
              <div>
                <label className="text-xs text-default-500 block mb-1">Stawka ryczałtu (%)</label>
                <select
                  value={simRyczalt}
                  onChange={(e) => setSimRyczalt(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-default-200 bg-background text-sm focus:outline-none focus:border-primary"
                >
                  {[2, 3, 5.5, 8.5, 12, 14, 15, 17].map((r) => (
                    <option key={r} value={r}>{r}% {r === 12 ? "(IT services)" : r === 17 ? "(wolne zawody)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              color="primary" variant="flat"
              isLoading={simulateMutation.isPending}
              startContent={!simulateMutation.isPending ? <Calculator className="h-4 w-4" /> : undefined}
              onPress={() => simulateMutation.mutate()}
            >
              Porównaj formy opodatkowania
            </Button>

            {simResults && (
              <div className="space-y-3 pt-2">
                {simResults.map((r) => {
                  const isBest = bestForm?.taxForm === r.taxForm;
                  return (
                    <div
                      key={r.taxForm}
                      className={`p-4 rounded-xl border-2 transition-all ${isBest ? "border-success/50 bg-success/5" : "border-default-100"}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {isBest && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                          <span className="font-semibold text-sm">{r.label}</span>
                          {isBest && <Chip size="sm" color="success" variant="flat">Najkorzystniejszy</Chip>}
                        </div>
                        <div className="font-bold text-lg text-success">{formatCurrency(r.netIncome)} <span className="text-xs font-normal text-default-400">netto</span></div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-default-500">
                        <div>Podatek: <span className="font-semibold text-foreground">{formatCurrency(r.annualTax)}</span></div>
                        <div>ZUS: <span className="font-semibold text-foreground">{formatCurrency(r.annualZusSocial)}</span></div>
                        <div>Zdrowotna: <span className="font-semibold text-foreground">{formatCurrency(r.annualHealth)}</span></div>
                        <div>Efektywna: <span className="font-semibold text-foreground">{r.effectiveTaxRate}%</span></div>
                      </div>
                    </div>
                  );
                })}
                {simResults.length > 1 && (() => {
                  const sorted = [...simResults].sort((a, b) => b.netIncome - a.netIncome);
                  const diff = sorted[0].netIncome - sorted[sorted.length - 1].netIncome;
                  return (
                    <p className="text-sm text-default-500 pt-1">
                      Różnica między najlepszą i najgorszą formą: <strong className="text-success">{formatCurrency(diff)}</strong> rocznie.
                    </p>
                  );
                })()}
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      {/* ZUS info */}
      {data.nip && (
        <section>
          <Card className="glass border-0" shadow="none">
            <CardBody className="p-5">
              <div className="font-semibold text-sm mb-3">Przydatne linki — przelewy ZUS i US</div>
              <div className="space-y-2 text-sm text-default-600">
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong>Mikrorachunek podatkowy</strong> (PIT, VAT):{" "}
                    <a href={`https://www.podatki.gov.pl/generator-mikrorachunku-podatkowego/`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      podatki.gov.pl → generator mikrorachunku
                    </a>
                    <div className="text-xs text-default-400 mt-0.5">NIP: {data.nip}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Konto ZUS</strong> (składki):{" "}
                    <a href="https://www.zus.pl/firmy/przedsiebiorcy/skladki/wplata-skladek" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      zus.pl → wpłata składek
                    </a>
                    <div className="text-xs text-default-400 mt-0.5">Numer konta jest indywidualny — sprawdź w PUE ZUS lub przez telefon</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-default-400">
                    <strong>Terminy:</strong> ZUS — do 20. każdego miesiąca · Zaliczka PIT — do 20. miesiąca za poprzedni miesiąc · VAT-7 — do 25. miesiąca za poprzedni miesiąc
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}
