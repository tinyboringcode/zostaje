# Komponenty — Kontrahenci

Ścieżka: `src/components/contractors/`  
Strony: `src/app/(app)/contractors/page.tsx`, `src/app/(app)/contractors/[id]/page.tsx`

---

## ContractorsClient

**Plik:** `src/components/contractors/ContractorsClient.tsx`

Lista kontrahentów z podsumowaniem finansowym.

### Lista

Każdy kontrahent:
- Nazwa + typ spółki (badge: JDG, Sp. z o.o., SA, itd.)
- NIP (jeśli podany)
- Suma faktur
- Suma nieopłaconych
- Liczba faktur przeterminowanych (badge czerwony)
- Przyciski: Szczegóły, Edytuj, Usuń

### Tworzenie/edycja kontrahenta

Modal z polami:

**Dane podstawowe:**
| Pole | Wymagane |
|------|----------|
| Nazwa | Tak |
| Typ firmy | Tak |
| NIP | Nie |
| E-mail | Nie |
| Telefon (z prefiksem) | Nie |

**Adres:**
| Pole |
|------|
| Ulica i numer |
| Miasto |
| Kod pocztowy |
| Kraj |

**Notatki:** Textarea

### Walidacja NIP
`/api/nip-lookup` — weryfikacja NIP (placeholder, do implementacji z GUS API).

### Dane (TanStack Query)
- `useQuery(["contractors"])` → `GET /api/contractors`
- `useMutation(create)` → `POST /api/contractors`
- `useMutation(update)` → `PUT /api/contractors/[id]`
- `useMutation(delete)` → `DELETE /api/contractors/[id]`

---

## ContractorDetail

**Plik:** `src/components/contractors/ContractorDetail.tsx`

Profil kontrahenta z historią faktur i transakcji.

### Sekcje

#### Nagłówek
- Pełne dane firmy (adres, NIP, kontakt)
- Łączna suma transakcji z tym kontrahentem
- Przycisk "Dodaj fakturę"

#### Lista faktur
Tabela faktur tego kontrahenta:
| Kolumna | Opis |
|---------|------|
| Numer | Numer faktury |
| Kwota | Brutto |
| Wystawiona | Data wystawienia |
| Termin | Data płatności |
| Status | Badge: pending/paid/overdue |
| Powiązana TX | Link do transakcji |

**Status badge:**
- `pending` — szary
- `paid` — zielony
- `overdue` — czerwony

**Oznacz jako zapłaconą:** Ustawia `paidAt=now`, `status=paid`.

#### Historia transakcji
Lista transakcji powiązanych z tym kontrahentem (`Transaction.contractorId`).

### Dane (TanStack Query)
- `useQuery(["contractor", id])` → `GET /api/contractors/[id]`
- `useQuery(["contractor-invoices", id])` → `GET /api/contractors/[id]/invoices`
- `useMutation(payInvoice)` → `PUT /api/contractors/[id]`

---

## Połączenia z innymi modułami
```
ContractorsClient / ContractorDetail
    ├─ /api/contractors         ← CRUD, lista z sumami
    ├─ /api/contractors/[id]    ← Szczegóły
    ├─ /api/contractors/[id]/invoices ← Faktury
    └─ /api/transactions        ← Historia transakcji kontrahenta
```

**Powiadomienia:** `POST /api/notifications/check-budgets` automatycznie ustawia `status=overdue` na fakturach po terminie.
