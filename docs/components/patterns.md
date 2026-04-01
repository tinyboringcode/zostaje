# Komponenty — Wzorce wydatków

Ścieżka: `src/components/patterns/`  
Strona: `src/app/(app)/patterns/page.tsx`

**Odblokowanie:** Feature gate `patterns` (30 tx + 30 dni).

---

## PatternsClient

**Plik:** `src/components/patterns/PatternsClient.tsx`

Analiza wzorców wydatków z ostatnich 12 miesięcy — wykrywa powtarzające się koszty, trendy i sezonowość.

### Sekcje

#### 1. Wzorce per kategoria

Tabela kategorii z analizą:

| Kategoria | Śr. miesięczna | Trend | Cykliczne? | Szczyt |
|-----------|----------------|-------|------------|--------|
| Hosting | 150 zł | stabilny | Tak | gru |
| Marketing | 800 zł | rosnący | Nie | mar |

**Trend:** `growing` / `stable` / `declining` (z ikonką strzałki)  
**Cykliczne:** checkbox — czy wydatek pojawia się regularnie co miesiąc

#### 2. Najszybciej rosnące koszty
Top 3 kategorie z największym wzrostem miesiąc do miesiąca.

#### 3. Koszty stałe
Kategorie zidentyfikowane jako regularne (np. hosting, subskrypcje).

#### 4. Metryki cashflow
- **Zmienność cashflow** — odchylenie standardowe miesięcznego zysku (niska = stabilny biznes)
- **Średnie opóźnienie płatności** — dni między wystawieniem a opłaceniem faktur

#### 5. Rekomendacje
Lista automatycznych wskazówek generowanych przez API:
- "Rozważ renegocjację umowy z dostawcą X (koszt rośnie 15% mies.)"
- "Marketing pochłania 25% przychodów — powyżej normy dla JDG"

### Anomalie

Panel z wynikami `GET /api/fingerprint` — wydatki statystycznie odbiegające od normy.

**Odblokowanie:** Feature gate `fingerprint` (60 tx + 60 dni).

| Kategoria | Bieżący | Oczekiwany | Z-score | Severity |
|-----------|---------|------------|---------|----------|
| Marketing | 4 500 zł | 1 800 zł | 2.8 | strong |

**Severity:**
- `mild` (|z| 1.0–1.5) — żółty
- `notable` (|z| 1.5–2.5) — pomarańczowy
- `strong` (|z| > 2.5) — czerwony

### Dane (TanStack Query)
- `useQuery(["patterns"])` → `GET /api/patterns`
- `useQuery(["fingerprint"])` → `GET /api/fingerprint`

### Połączenia z innymi modułami
```
PatternsClient
    ├─ /api/patterns     ← Analiza 12-miesięczna
    └─ /api/fingerprint  ← Anomalie z-score
```
