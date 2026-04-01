# Komponenty — Dashboard

Ścieżka: `src/components/dashboard/`  
Strona: `src/app/(app)/page.tsx` → `src/app/(app)/dashboard-pro/page.tsx`

---

## DashboardHub

**Plik:** `src/components/dashboard/DashboardHub.tsx`

Router między trybem prostym i zaawansowanym. Sprawdza preferencje użytkownika w localStorage i renderuje odpowiedni widok.

```
DashboardHub
  ├─ DashboardClient      (tryb prosty, domyślny)
  └─ DashboardPro         (tryb zaawansowany, /dashboard-pro)
```

---

## DashboardClient

**Plik:** `src/components/dashboard/DashboardClient.tsx`

Główny dashboard z selekcją okresu i 4 widgetami.

**Stan lokalny:**
- `selectedMonth` — wybrany miesiąc (domyślnie bieżący)

**Dane (TanStack Query):**
- `useQuery(["dashboard", month])` → `GET /api/dashboard?month=YYYY-MM`

**Wyświetla:**
1. Selektor okresu (bieżący / poprzedni / kwartał / rok)
2. `KPICards` — 4 karty KPI
3. `CashflowChart` — wykres 12 miesięcy
4. `TopCategoriesPie` — kołowy top 5
5. Przycisk "Tryb Pro"
6. `ProgressCard` — postęp odkrywania funkcji

---

## KPICards

**Plik:** `src/components/dashboard/KPICards.tsx`

4 karty metryczne dla wybranego miesiąca:

| Karta | Wartość | Kolor |
|-------|---------|-------|
| Przychody | `kpi.income` | Zielony |
| Koszty | `kpi.expense` | Czerwony |
| Zysk | `kpi.profit` | Niebieski/żółty |
| Transakcje | `kpi.transactionCount` | Fioletowy |

Używa `formatCurrency()` z `@/lib/formatters` (pl-PL).  
Animowane liczniki przez `react-countup`.

---

## CashflowChart

**Plik:** `src/components/dashboard/CashflowChart.tsx`

Wykres liniowy/słupkowy cashflow z ostatnich 12 miesięcy.

**Dane:** `dashboard.cashflow` — tablica `{ month, income, expense, profit }`.

**Biblioteka:** Recharts (`LineChart` lub `BarChart`).

**Funkcje:**
- Przełącznik przychody/koszty/zysk
- Tooltip z formatowaniem PLN
- Oś X z polskimi skróconymi miesiącami (`monthLabel()`)

---

## TopCategoriesPie

**Plik:** `src/components/dashboard/TopCategoriesPie.tsx`

Wykres kołowy top 5 kategorii kosztowych.

**Dane:** `dashboard.topCategories` — `[{ name, total, color }]`.

**Biblioteka:** Recharts (`PieChart` + `Cell`).

**Funkcje:**
- Kolory z `category.color`
- Legenda z kwotami
- Tooltip formatowany PLN

---

## AIAnalysis

**Plik:** `src/components/dashboard/AIAnalysis.tsx`

Panel AI insights (wymaga Ollama).

**Dane:** `POST /api/ai/analyze`

**Wyświetla:**
- Status połączenia z Ollama
- Wygenerowane insighty z wzorców transakcji
- Skeleton loader podczas ładowania

Widoczne tylko jeśli `ollamaEnabled=true` w Settings.

---

## FingerprintAlerts

**Plik:** `src/components/dashboard/FingerprintAlerts.tsx`

Panel alertów anomalii wydatkowych.

**Dane:** `GET /api/fingerprint`

**Wyświetla:**
- Lista anomalii z severity badge (`mild` / `notable` / `strong`)
- Z-score i odchylenie od oczekiwanej wartości
- Pusty stan jeśli brak anomalii lub za mało danych (< 60 transakcji)

**Odblokowanie:** Feature gate `fingerprint` (60 tx + 60 dni).

---

## ProgressCard

**Plik:** `src/components/dashboard/ProgressCard.tsx`

Karta gamifikacji — postęp do następnego odblokownia funkcji.

**Dane:** `GET /api/system/progress`

**Wyświetla:**
- % ukończenia do następnego progu
- Nazwa następnej funkcji do odblokowania
- `Progress` bar (HeroUI)
- Liczba transakcji i dni aktywności

---

## Połączenia z innymi modułami

```
DashboardClient
    ├─ /api/dashboard          ← KPIs, cashflow, topCategories
    ├─ /api/fingerprint        ← Anomalie (jeśli odblokowane)
    ├─ /api/ai/analyze         ← AI insights (jeśli Ollama)
    └─ /api/system/progress    ← Postęp odkrywania funkcji
```
