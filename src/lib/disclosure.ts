export type FeatureKey =
  | "dashboard_basic"
  | "categories"
  | "budgets"
  | "reports_basic"
  | "ai_suggestions"
  | "patterns"
  | "fingerprint"
  | "cykl"
  | "taxes"
  | "wskazniki"
  | "reports_advanced";

export interface DisclosureGate {
  key: FeatureKey;
  label: string;
  description: string;
  txMin: number;
  daysMin: number;
  hint: string; // shown in ProgressCard when locked
}

export const DISCLOSURE_GATES: DisclosureGate[] = [
  {
    key: "dashboard_basic",
    label: "Panel główny",
    description: "Podstawowe KPI i podsumowanie miesiąca",
    txMin: 0,
    daysMin: 0,
    hint: "",
  },
  {
    key: "categories",
    label: "Kategorie",
    description: "Zarządzanie kategoriami wydatków i przychodów",
    txMin: 1,
    daysMin: 0,
    hint: "Dodaj pierwszą transakcję",
  },
  {
    key: "budgets",
    label: "Budżety",
    description: "Limity miesięczne per kategoria",
    txMin: 5,
    daysMin: 0,
    hint: "Dodaj 5 transakcji aby odblokować budżety",
  },
  {
    key: "taxes",
    label: "Podatki i ZUS",
    description: "Kalkulacja podatku i składek ZUS",
    txMin: 5,
    daysMin: 0,
    hint: "Dodaj 5 transakcji aby zobaczyć kalkulacje podatkowe",
  },
  {
    key: "reports_basic",
    label: "Podstawowe raporty",
    description: "Wykresy przychodów i wydatków",
    txMin: 10,
    daysMin: 7,
    hint: "Potrzebujesz 10 transakcji z przynajmniej 7 dni",
  },
  {
    key: "ai_suggestions",
    label: "Sugestie kategorii",
    description: "Automatyczne propozycje kategorii dla nowych transakcji",
    txMin: 20,
    daysMin: 0,
    hint: "Dodaj 20 transakcji aby uruchomić inteligentne sugestie",
  },
  {
    key: "wskazniki",
    label: "Wskaźniki finansowe",
    description: "Zaawansowane metryki: runway, rentowność, płynność",
    txMin: 20,
    daysMin: 14,
    hint: "Potrzebujesz 20 transakcji z 2 tygodniami historii",
  },
  {
    key: "patterns",
    label: "Wykrywanie wzorców",
    description: "Algorytmiczne wykrywanie stałych kosztów i sezonowości",
    txMin: 30,
    daysMin: 30,
    hint: "Potrzebujesz 30 transakcji z miesiącem historii",
  },
  {
    key: "cykl",
    label: "Cykl finansowy",
    description: "Analiza przepływu gotówki i cyklu operacyjnego",
    txMin: 30,
    daysMin: 30,
    hint: "Potrzebujesz 30 transakcji z miesiącem historii",
  },
  {
    key: "fingerprint",
    label: "Fingerprint finansowy",
    description: "Wykrywanie anomalii na podstawie Twojej historii",
    txMin: 60,
    daysMin: 60,
    hint: "Potrzebujesz 60 transakcji z 2 miesiącami historii",
  },
  {
    key: "reports_advanced",
    label: "Raporty zaawansowane",
    description: "Zestawienia roczne, prognozowanie, eksport",
    txMin: 50,
    daysMin: 90,
    hint: "Potrzebujesz 50 transakcji z 3 miesiącami historii",
  },
];

export interface DisclosureState {
  txCount: number;
  oldestDays: number;
  unlocked: Set<FeatureKey>;
  locked: DisclosureGate[];
  nextUnlock: DisclosureGate | null;
  progressPct: number; // toward next unlock, 0-100
}

export function computeDisclosure(txCount: number, oldestDays: number): DisclosureState {
  const unlocked = new Set<FeatureKey>();
  const locked: DisclosureGate[] = [];

  for (const gate of DISCLOSURE_GATES) {
    if (txCount >= gate.txMin && oldestDays >= gate.daysMin) {
      unlocked.add(gate.key);
    } else {
      locked.push(gate);
    }
  }

  // Next unlock = first locked gate
  const nextUnlock = locked[0] ?? null;
  let progressPct = 100;

  if (nextUnlock) {
    const txProgress = nextUnlock.txMin > 0
      ? Math.min(txCount / nextUnlock.txMin, 1)
      : 1;
    const daysProgress = nextUnlock.daysMin > 0
      ? Math.min(oldestDays / nextUnlock.daysMin, 1)
      : 1;
    progressPct = Math.round(Math.min(txProgress, daysProgress) * 100);
  }

  return { txCount, oldestDays, unlocked, locked, nextUnlock, progressPct };
}
