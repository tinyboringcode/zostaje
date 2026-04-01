# Server — Wykrywanie anomalii (Fingerprint)

**Plik:** `src/server/fingerprint.ts`  
**Wymaga:** 60+ transakcji (feature gate `fingerprint`)

---

## Koncepcja

Statystyczne wykrywanie nieprawidłowych wydatków metodą z-score. Porównuje bieżące wydatki w kategorii z historycznym baselineм z ostatnich 6 miesięcy.

---

## `computeBaselines()`

Oblicza historyczne normy per kategoria.

**Algorytm:**
1. Pobierz transakcje `EXPENSE` z ostatnich 6 miesięcy
2. Zgrupuj po `categoryId` i `miesiąc`
3. Dla każdej kategorii oblicz `mean` i `stddev` (tylko miesiące z wydatkami > 0)
4. Wymagane minimum: 2 miesiące z danymi

**Zwraca:**
```ts
Map<categoryId, { mean: number, stddev: number, months: number }>
```

---

## `detectAnomalies()`

Wykrywa anomalie w bieżącym miesiącu.

**Algorytm:**
```
dla każdej kategorii z baselineم:
  currentAmount = suma wydatków w tym miesiącu
  zScore = (currentAmount - mean) / stddev
  
  jeśli |zScore| > 1.0:
    severity = mild    (1.0 – 1.5)
    severity = notable (1.5 – 2.5)
    severity = strong  (> 2.5)
    dodaj do anomalii
```

**Zwraca:**
```ts
[{
  categoryId: string,
  categoryName: string,
  currentAmount: number,
  expectedAmount: number,   // mean z baseline
  zScore: number,
  severity: "mild" | "notable" | "strong"
}]
```

---

## Interpretacja z-score

| |z-score| | Znaczenie |
|----------|-----------|
| < 1.0 | Normalnie |
| 1.0–1.5 | Mild — lekko powyżej normy |
| 1.5–2.5 | Notable — wyraźna anomalia |
| > 2.5 | Strong — bardzo silna anomalia |

---

## Przykład

Kategoria "Marketing":
- Ostatnie 6 miesięcy: 1000, 1200, 800, 1500, 900, 1100 PLN
- Mean = 1083, Stddev = 245
- Bieżący miesiąc: 4500 PLN
- Z-score = (4500 - 1083) / 245 = **13.9** → `strong` anomalia

---

## Integracja z UI

- `GET /api/fingerprint` → `detectAnomalies()`
- Wyświetlane w `FingerprintAlerts` na dashboardzie
- Wyświetlane w `PatternsClient` w sekcji anomalii

---

## Ograniczenia

- Wymaga min. 60 transakcji EXPENSE historycznie
- Min. 2 miesiące danych per kategoria (inaczej nie ma baseline)
- Nie wykrywa anomalii w przychodach (tylko EXPENSE)
- Wrażliwy na pierwszą transakcję nowej kategorii (brak historii)
