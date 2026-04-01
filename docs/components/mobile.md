# Komponenty — Wersja mobilna

Ścieżka: `src/components/mobile/`, `src/app/m/`

---

## Routing mobile

Middleware (`src/middleware.ts`) automatycznie przekierowuje na `/m/` gdy wykryje mobilny user-agent na ścieżce `/`.

Ścieżki mobilne:
| URL | Opis |
|-----|------|
| `/m/` | Strona główna mobile |
| `/m/add` | Szybkie dodawanie transakcji |
| `/m/transactions` | Lista transakcji |
| `/m/podatki` | Podsumowanie podatkowe |

---

## Layout mobilny

**Plik:** `src/app/m/layout.tsx`

Brak sidebara. Dolna nawigacja `BottomNav`.

```
{children}
────────────
BottomNav
```

---

## BottomNav

**Plik:** `src/components/mobile/BottomNav.tsx`

Dolny pasek nawigacji (iOS/Android style), 4-5 zakładek:

| Ikona | Label | Ścieżka |
|-------|-------|---------|
| 🏠 | Główna | `/m/` |
| ➕ | Dodaj | `/m/add` |
| 📋 | Transakcje | `/m/transactions` |
| 🧮 | Podatki | `/m/podatki` |

Aktywna zakładka podświetlona kolorem akcentu.

---

## MobileHome

**Plik:** `src/components/mobile/MobileHome.tsx`

Uproszczony dashboard dla mobile.

**Wyświetla:**
- KPI bieżącego miesiąca (przychody, koszty, zysk)
- Ostatnie 5 transakcji
- Przycisk FAB (+) do szybkiego dodania transakcji
- Uproszczony cashflow (ostatnie 6 miesięcy)

**Dane:** `GET /api/dashboard?month=YYYY-MM`

---

## MobileAdd

**Plik:** `src/components/mobile/MobileAdd.tsx`

Zoptymalizowany formularz szybkiego dodawania transakcji.

### Tryb naturalnego języka
Pole tekstowe do wpisania transakcji słownie:
- `"500 zł marketing"` → EXPENSE, 500 PLN, auto-kategoria: Marketing
- `"przychód 1200 faktura"` → INCOME, 1200 PLN

Parsowanie przez `src/lib/parse-transaction.ts`:
- Ekstrakcja kwoty (regex)
- Klasyfikacja INCOME/EXPENSE (słowa kluczowe)
- Sugestia kategorii
- Zwraca `confidence` score

### Standardowy formularz
Uproszczone pola (bez kontrahenta/faktury dla szybkości):
- Kwota (duży input numeryczny)
- Typ (toggle)
- Opis
- Kategoria (horizontal scroll)
- Data (domyślnie dziś)

---

## MobileTransactions

**Plik:** `src/components/mobile/MobileTransactions.tsx`

Lista transakcji zoptymalizowana pod dotyk.

**Funkcje:**
- Infinite scroll (zamiast paginacji)
- Pull-to-refresh
- Swipe left → usuń
- Swipe right → edytuj
- Filtr uproszczony (typ, bieżący/poprzedni miesiąc)

---

## MobilePodatki

**Plik:** `src/components/mobile/MobilePodatki.tsx`

Skrócone podsumowanie podatkowe.

**Wyświetla:**
- Najbliższe terminy ZUS/PIT (następne 3)
- Szacowana zaliczka na bieżący miesiąc
- Łączne obciążenie

**Dane:** `GET /api/taxes?month=YYYY-MM`

---

## QuickAdd (FAB)

**Plik:** `src/components/quick-add/QuickAdd.tsx`

Floating Action Button widoczny na wszystkich stronach mobile.

Kliknięcie → otwiera `MobileAdd` jako bottom sheet.
