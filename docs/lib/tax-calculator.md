# Lib — Kalkulator podatkowy

**Plik:** `src/lib/tax-calculator.ts`  
**Plik stawek 2026:** `src/lib/zus-2026.ts`

Kompleksowy moduł obliczeń podatkowych dla polskich JDG. Obsługuje 3 formy opodatkowania i 4 etapy ZUS.

---

## Stałe ZUS 2026 (`zus-2026.ts`)

```ts
ZUS_BASE_2026 = 5203.89        // 60% prognozowanego przeciętnego wynagrodzenia
SKLADKA_EMERYTALNA_RATE = 0.1952
SKLADKA_RENTOWA_RATE = 0.08
SKLADKA_CHOROBOWA_RATE = 0.0245
SKLADKA_WYPADKOWA_RATE = 0.0167
FUNDUSZ_PRACY_RATE = 0.0245
```

---

## `calcZusSocial(stage)`

Oblicza składki ZUS społeczny na podstawie etapu.

**Parametr:** `stage: "ulga_na_start" | "maly_zus" | "maly_zus_plus" | "full"`

**Zwraca:**
```ts
{
  emerytalne: number,
  rentowe: number,
  chorobowe: number,
  wypadkowe: number,
  fp: number,           // Fundusz Pracy
  total: number,
  base: number          // Podstawa wymiaru
}
```

**Etapy:**

| Etap | Czas trwania | Podstawa | Łącznie (2026) |
|------|-------------|---------|----------------|
| `ulga_na_start` | Pierwsze 6 miesięcy | 0 | 0 PLN |
| `maly_zus` | Następne 24 miesiące | 30% przeciętnego | ~484 PLN |
| `maly_zus_plus` | Do 2 lat, dochód < 120k | Proporcjonalne | ~600 PLN |
| `full` | Po preferencjach | 60% prognozowanego (5203.89) | ~1 485 PLN |

---

## `calcHealthInsurance(taxForm, monthlyIncome, monthlyRevenue)`

Oblicza składkę zdrowotną — zależy od formy opodatkowania.

**Parametry:**
- `taxForm: "tax_scale" | "linear" | "flat_rate"`
- `monthlyIncome` — dochód (przychód - koszty)
- `monthlyRevenue` — przychód brutto (dla ryczałtu)

**Formuły:**

| Forma | Podstawa | Stawka | Minimum |
|-------|---------|--------|---------|
| Skala podatkowa | Dochód | 9% | 314.96 PLN |
| Liniowy | Dochód | 4.9% | 314.96 PLN |
| Ryczałt (przychód < 60k) | 60% min. wynagrodzenia | 9% | — |
| Ryczałt (60k–300k) | 100% min. wynagrodzenia | 9% | — |
| Ryczałt (> 300k) | 180% min. wynagrodzenia | 9% | — |

---

## `calcPitAdvance(input)`

Oblicza miesięczną zaliczkę PIT (narastająco od początku roku).

**Input:**
```ts
{
  taxForm: string,
  ytdRevenue: number,      // Przychody YTD
  ytdCosts: number,        // Koszty YTD
  ytdZusSocial: number,    // Zapłacone składki ZUS YTD
  ytdHealth: number,       // Składka zdrowotna YTD (odliczana od podatku dla skali)
  month: number            // 1–12 (do obliczenia liczby miesięcy)
}
```

**Zwraca:**
```ts
{
  taxBase: number,
  tax: number,
  advance: number,         // Do zapłaty w tym miesiącu (total - poprzednie)
  effectiveRate: number    // %
}
```

**Algorytm dla skali podatkowej:**
```
taxBase = ytdRevenue - ytdCosts - ytdZusSocial
tax = min(taxBase, 120000) × 12% + max(0, taxBase - 120000) × 32%
tax -= ytdHealth (max odliczenie: podatek)
advance = tax - suma_poprzednich_zaliczek
```

---

## `simulateAllForms(input)`

Porównuje 3 formy opodatkowania dla podanych parametrów.

**Input:**
```ts
{
  annualRevenue: number,
  annualCosts: number,
  zusStage: string,
  ryczaltRate: number
}
```

**Zwraca:** Tablica 3 wyników:
```ts
[
  {
    form: "tax_scale",
    label: "Skala podatkowa",
    effectiveTaxRate: 15.2,
    netIncome: 41500,
    totalBurden: 18500,
    breakdown: { zus, health, pit }
  },
  { form: "linear", ... },
  { form: "flat_rate", ... }
]
```

Wynik sortowany od najkorzystniejszego (najwyższy `netIncome`).

---

## `getObligations(date, settings)`

Generuje kalendarz nadchodzących zobowiązań.

**Zwraca:**
```ts
[
  {
    type: "ZUS" | "PIT" | "VAT",
    label: "ZUS społeczny",
    dueDate: Date,
    daysUntil: number,
    urgent: boolean         // daysUntil < 7
  }
]
```

**Terminy:**
- ZUS społeczny: 20. każdego miesiąca
- ZUS zdrowotny: 20. każdego miesiąca
- Zaliczka PIT: 20. każdego miesiąca
- VAT miesięczny: 25. każdego miesiąca
- VAT kwartalny: 25. po końcu kwartału (kwiecień, lipiec, październik, styczeń)

---

## Pomocnicze

### `round2(n)`
Zaokrągla do 2 miejsc po przecinku.

### `getZusAccountNumber(nip)`
Generuje indywidualny numer konta ZUS na podstawie NIP.

### `getUrzadSkarbowy(postalCode)`
Zwraca nazwę właściwego urzędu skarbowego wg kodu pocztowego.
