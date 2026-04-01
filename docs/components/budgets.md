# Komponenty — Budżety

Ścieżka: `src/components/budgets/`  
Strona: `src/app/(app)/budgets/page.tsx`

---

## BudgetsClient

**Plik:** `src/components/budgets/BudgetsClient.tsx`

Zarządzanie miesięcznymi limitami wydatków per kategoria.

### Funkcje

#### Selekcja miesiąca
Przycisk `<` / `>` do nawigacji między miesiącami. Domyślnie bieżący miesiąc.

#### Lista budżetów
Tabela lub karty dla każdej kategorii `EXPENSE`:
- Nazwa + emoji + kolor kategorii
- Limit (edytowalny inline lub przez modal)
- Aktualne wydatki w tym miesiącu
- Progress bar: `(wydatki / limit) × 100%`

**Kolory progress bara:**
| Próg | Kolor |
|------|-------|
| 0–79% | Zielony |
| 80–99% | Żółty (ostrzeżenie) |
| 100%+ | Czerwony (przekroczony) |

#### Dodawanie/edycja budżetu
Modal z polami:
- Kategoria (Select)
- Miesiąc
- Limit (Input number, PLN)

Zapis przez `POST /api/budgets` z upsert — bezpieczne dla istniejących.

#### Kopiowanie z poprzedniego miesiąca
Przycisk "Kopiuj z poprzedniego miesiąca" → `POST /api/budgets` dla każdej kategorii.

### Dane (TanStack Query)
- `useQuery(["budgets", month])` → `GET /api/budgets?month=YYYY-MM`
- `useQuery(["categories"])` → `GET /api/categories`
- `useMutation(upsert)` → `POST /api/budgets`
- `useMutation(delete)` → `DELETE /api/budgets/[id]`

### Połączenia z innymi modułami
```
BudgetsClient
    ├─ /api/budgets       ← Lista, upsert, delete
    ├─ /api/categories    ← Dostępne kategorie EXPENSE
    └─ /api/transactions  ← Suma wydatków per kategoria w miesiącu
```

**Powiadomienia:** `POST /api/notifications/check-budgets` sprawdza te same wartości i wysyła e-mail gdy próg przekroczony.
