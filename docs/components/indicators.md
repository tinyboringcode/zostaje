# Komponenty — Wskaźniki biznesowe

Ścieżka: `src/components/indicators/`  
Strona: `src/app/(app)/wskazniki/page.tsx`

**Odblokowanie:** Feature gate `wskazniki` (20 tx + 14 dni).

---

## IndicatorsClient

**Plik:** `src/components/indicators/IndicatorsClient.tsx`

Panel zaawansowanych wskaźników finansowych obliczanych z historii transakcji.

### Metryki

#### Runway (Pas startowy)
Ile miesięcy przetrwa firma przy obecnym burn rate bez nowych przychodów.

```
runway = saldo_kasy / burn_rate_miesięczny
```

Wyświetlane jako: `8.5 mies.` z paskiem postępu (czerwony < 3, żółty < 6, zielony ≥ 6).

#### Burn Rate
Średnia miesięczna wydatków z ostatnich 3 miesięcy.

#### Przychód na klienta
Średni przychód per unikalny kontrahent.

#### Koncentracja ryzyka
Wskaźnik HHI (Herfindahl-Hirschman) — jak bardzo przychody są skoncentrowane u jednego klienta.

- `0.0–0.15` — dywersyfikacja
- `0.15–0.40` — umiarkowana koncentracja
- `0.40+` — wysokie ryzyko (czerwony alert)

#### Sezonowość
Wykres słupkowy średnich przychodów/kosztów per miesiąc roku (wykrywa sezonowe wzorce).

#### Prognoza
Przewidywany przychód następnego miesiąca (regresja liniowa na 12 miesiącach).

Wyświetlana z przedziałem ufności (`confidence`) jako % pewności.

#### Break-even
Minimalne miesięczne przychody potrzebne do pokrycia kosztów stałych.

#### Trend
Ogólny kierunek (rosnący / stabilny / malejący) z analizy 12-miesięcznego trendu liniowego.

### Dane (TanStack Query)
- `useQuery(["indicators"])` → `GET /api/indicators`

### Odpowiedź API
```json
{
  "runway": 8.5,
  "burnRate": 3200,
  "revenuePerClient": 2833,
  "concentrationRisk": 0.45,
  "seasonality": [
    { "month": 1, "avgIncome": 7200, "avgExpense": 3100 }
  ],
  "forecast": {
    "nextMonth": 5600,
    "confidence": 0.78,
    "trend": "growing"
  },
  "breakEven": 2100,
  "trend": "growing"
}
```

### Połączenia z innymi modułami
```
IndicatorsClient
    └─ /api/indicators   ← Wszystkie metryki z historii transakcji
```
