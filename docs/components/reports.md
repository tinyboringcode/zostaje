# Komponenty — Raporty

Ścieżka: `src/components/reports/`  
Strona: `src/app/(app)/reports/page.tsx`

---

## ReportsClient

**Plik:** `src/components/reports/ReportsClient.tsx`

Raporty finansowe: miesięczne P&L, kategorie, eksport.

### Sekcje

#### 1. Selektor roku
Wybór roku do analizy (domyślnie bieżący).

#### 2. Tabela miesięcznego P&L

12 wierszy dla każdego miesiąca:

| Miesiąc | Przychody | Koszty | Zysk | Zmiana % |
|---------|-----------|--------|------|----------|
| Sty | 8 500 zł | 3 200 zł | 5 300 zł | +12% |
| Lut | ... | ... | ... | ... |

- Kolory: zysk zielony, strata czerwona
- Wiersz "Suma" na dole
- Zmiana % miesiąc do miesiąca

**Odblokowanie:** Feature gate `reports_basic` (10 tx + 7 dni).

#### 3. Rozkład kategorii
Wykres słupkowy lub tabela kosztów per kategoria dla wybranego roku.

**Odblokowanie:** Feature gate `reports_advanced` (50 tx + 90 dni).

#### 4. Eksport

Przyciski eksportu:
- **CSV** — `GET /api/reports/export?format=csv&dateFrom=...&dateTo=...`
- **Excel (XLSX)** — `GET /api/reports/export?format=xlsx`

Dodatkowe filtry eksportu:
- Zakres dat
- Typ (przychody/koszty/wszystkie)

### Dane (TanStack Query)
- `useQuery(["reports-monthly", year])` → `GET /api/reports/monthly?year=YYYY`
- `useQuery(["reports-category", year])` → `GET /api/reports/category?year=YYYY`

### Połączenia z innymi modułami
```
ReportsClient
    ├─ /api/reports/monthly    ← P&L per miesiąc
    ├─ /api/reports/category   ← Koszty per kategoria
    └─ /api/reports/export     ← Pobierz CSV/XLSX
```
