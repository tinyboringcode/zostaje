# Komponenty — Kategorie

Ścieżka: `src/components/categories/`  
Strona: `src/app/(app)/categories/page.tsx`

---

## CategoriesClient

**Plik:** `src/components/categories/CategoriesClient.tsx`

Zarządzanie kategoriami przychodów i kosztów.

### Funkcje

#### Lista kategorii
Dwa taby: **Koszty** / **Przychody**

Każda kategoria:
- Emoji + kolor (jako dot/badge)
- Nazwa
- `mixedUsagePct` — % odliczenia (100% pełne / 75% auto / 50% częściowe)
- Liczba powiązanych transakcji
- Przyciski: Edytuj, Archiwizuj

#### Tworzenie/edycja kategorii
Modal z polami:

| Pole | Komponent | Opis |
|------|-----------|------|
| Typ | Toggle | INCOME / EXPENSE |
| Nazwa | Input | Wymagane |
| Emoji | EmojiPicker lub Input | Wybór emoji |
| Kolor | ColorPicker lub Input | HEX color |
| Użycie mieszane | Select | 100% / 75% / 50% |

#### Archiwizacja
Kategoria nie jest usuwana — `isArchived=true`. Transakcje historyczne pozostają przypisane.

Przycisk "Pokaż zarchiwizowane" → toggle widoku.

### Dane (TanStack Query)
- `useQuery(["categories"])` → `GET /api/categories`
- `useMutation(create)` → `POST /api/categories`
- `useMutation(update)` → `PUT /api/categories/[id]`
- `useMutation(archive)` → `DELETE /api/categories/[id]`

### Połączenia z innymi modułami
```
CategoriesClient
    ├─ /api/categories   ← CRUD
    └─ /api/transactions ← Liczba transakcji per kategoria
```

**CategoryRule:** Tworzenie/edycja kategorii nie wpływa na `CategoryRule` — reguły ML są aktualizowane automatycznie przez `categorizer` przy każdej transakcji.
