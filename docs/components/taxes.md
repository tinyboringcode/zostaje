# Komponenty — Podatki

Ścieżka: `src/components/taxes/`  
Strona: `src/app/(app)/taxes/page.tsx` oraz `src/app/(app)/podatki/page.tsx`

---

## TaxesClient

**Plik:** `src/components/taxes/TaxesClient.tsx`

Kompleksowy kalkulator podatkowy dla polskich JDG. Wyświetla bieżące obciążenia, harmonogram płatności i symulator form opodatkowania.

### Sekcje

#### 1. Selector miesiąca
Wybór miesiąca do obliczenia zaliczki (domyślnie bieżący).

#### 2. Wyniki YTD
Karty z narastającymi wartościami od początku roku:
- Przychody YTD
- Koszty YTD
- Dochód YTD

#### 3. Obciążenia miesięczne
| Pozycja | Opis |
|---------|------|
| ZUS społeczny | Suma składek (emerytalna, rentowa, chorobowa, wypadkowa, FP) |
| Składka zdrowotna | Zależy od formy i dochodu |
| Zaliczka PIT | Narastająco od początku roku |
| Łączne obciążenie | Suma wszystkich |

#### 4. Harmongram zobowiązań
Tabela nadchodzących terminów płatności:
| Typ | Termin | Dni do płatności | Pilne? |
|-----|--------|------------------|--------|
| ZUS społeczny | 20. każdego | < 7 dni = urgent | |
| ZUS zdrowotny | 20. każdego | | |
| Zaliczka PIT | 20. każdego | | |
| VAT (jeśli vatPayer) | 25. każdego / kwartalne | | |

Kolor czerwony gdy `daysUntil < 3`.

#### 5. Symulator form opodatkowania
Przycisk "Porównaj formy" → modal z symulatorem.

**Formularz:**
- Roczny przychód
- Roczne koszty
- Etap ZUS
- Stawka ryczałtu

**Wyniki:** Tabela 3 form z:
- Efektywna stawka podatkowa
- Dochód netto
- Łączne obciążenie
- Rekomendacja (najlepsza forma wyróżniona)

### Dane (TanStack Query)
- `useQuery(["taxes", month])` → `GET /api/taxes?month=YYYY-MM`
- `useMutation` → `POST /api/taxes/simulate`

### Obliczenia

Wszystkie obliczenia w `src/lib/tax-calculator.ts`:

**ZUS społeczny** — zależy od etapu (`zusStage`):
- `ulga_na_start` — 0 PLN (pierwsze 6 miesięcy)
- `maly_zus` — stawki preferencyjne (~30% pełnych)
- `maly_zus_plus` — proporcjonalne do dochodu
- `full` — pełne składki (baza: 5203.89 PLN w 2026)

**Składka zdrowotna** — zależy od formy:
- Ryczałt: 60%/100%/180% płacy minimalnej × 9%
- Liniowy: 4.9% dochodu (min 314.96 PLN)
- Skala: 9% dochodu (min 314.96 PLN)

**Zaliczka PIT** — narastająca YTD:
- Skala: 12% do 120k PLN, 32% powyżej
- Liniowy: 19% flat
- Ryczałt: stawka ryczałtu × przychód

### Połączenia z innymi modułami
```
TaxesClient
    ├─ /api/taxes         ← Obliczenia YTD + harmonogram
    ├─ /api/taxes/simulate ← Porównanie form
    └─ /api/settings      ← taxForm, zusStage, vatPeriod (przez kontekst lub bezpośrednio)
```
