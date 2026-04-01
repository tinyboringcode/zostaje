# Komponenty — Transakcje

Ścieżka: `src/components/transactions/`  
Strona: `src/app/(app)/transactions/page.tsx`

---

## TransactionsClient

**Plik:** `src/components/transactions/TransactionsClient.tsx`

Główny komponent zarządzania transakcjami. Tabela z sortowaniem, filtrowaniem i operacjami masowymi.

### Stan lokalny
- `filters` — aktywne filtry (typ, kategoria, zakres dat, szukaj)
- `sortBy`, `sortDir` — sortowanie tabeli
- `page` — aktualna strona paginacji
- `selectedIds` — zaznaczone wiersze (checkbox)
- Flagi modali: `isFormOpen`, `isDeleteOpen`, `isImportOpen`

### Dane (TanStack Query)
- `useQuery(["transactions", filters, page, sort])` → `GET /api/transactions`
- `useQuery(["categories"])` → `GET /api/categories` (dla filtru)
- `useMutation` → `POST`, `PUT`, `DELETE /api/transactions`

### Filtry okresu (presets)
| Preset | Zakres |
|--------|--------|
| Bieżący miesiąc | 1 — dziś danego miesiąca |
| Poprzedni miesiąc | Pełny poprzedni miesiąc |
| Bieżący kwartał | Od początku kwartału |
| Bieżący rok | Od 1 stycznia |
| Własny | DatePicker from/to |

### Tabela
Kolumny: Data | Opis | Kategoria | Kontrahent | Kwota | Akcje

- Sortowanie po każdej kolumnie
- Checkbox na każdym wierszu + "zaznacz wszystkie"
- Kolor kwoty: zielony (INCOME) / czerwony (EXPENSE)
- Emoji + kolor kategorii

### Operacje masowe
- Usuń zaznaczone (z potwierdzeniem)
- Eksport zaznaczonych do CSV

### Modalna edycja
Otwiera `TransactionForm` w trybie tworzenia lub edycji.

---

## TransactionForm

**Plik:** `src/components/transactions/TransactionForm.tsx`

Formularz dodawania/edycji transakcji.

### Pola formularza
| Pole | Komponent | Opis |
|------|-----------|------|
| Typ | ToggleGroup | INCOME / EXPENSE |
| Data | Input type=date | Format YYYY-MM-DD |
| Kwota | Input number | Zawsze dodatnia |
| Opis | Input text | Automatyczne sugestie |
| Kategoria | Select | Lista z kolorami i emoji |
| Kontrahent | Select | Opcjonalne |

### Funkcje
- **Auto-kategoryzacja:** po wpisaniu opisu wywołuje `POST /api/ai/categorize` → sugeruje kategorię
- **Walidacja:** wymagane: typ, data, kwota, opis
- **Tryb edycji:** pre-fill z istniejącej transakcji

---

## CSVImportDialog

**Plik:** `src/components/transactions/CSVImportDialog.tsx`

Dialog importu transakcji z pliku CSV.

### Kroki
1. Upload pliku (drag & drop lub click)
2. Podgląd pierwszych N wierszy
3. Wybór domyślnej kategorii (dla nierozpoznanych)
4. Import → `POST /api/transactions/import`

### Obsługiwane formaty
Parser w `src/lib/csv-parser.ts` obsługuje:
- Daty: YYYY-MM-DD, DD.MM.YYYY, DD-MM-YYYY
- Separatory: `;` lub `,`
- Polskie tysiące: spacje, kropki
- Kwoty ujemne i dodatnie → auto-detekcja INCOME/EXPENSE

### Po imporcie
- Toast z liczbą zaimportowanych
- `queryClient.invalidateQueries(["transactions"])`

---

## Połączenia z innymi modułami

```
TransactionsClient
    ├─ /api/transactions        ← Lista, CRUD
    ├─ /api/categories          ← Filtry, Select
    ├─ /api/contractors         ← Select kontrahenta
    ├─ /api/ai/categorize       ← Sugestia kategorii (Ollama)
    └─ /api/transactions/import ← Import CSV
```
