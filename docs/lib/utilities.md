# Lib — Narzędzia pomocnicze

---

## utils.ts

**Plik:** `src/lib/utils.ts`

### `cn(...inputs)`

Łączy klasy CSS z automatycznym rozwiązywaniem konfliktów Tailwind.

```ts
import { cn } from "@/lib/utils"

cn("px-4 py-2", isActive && "bg-blue-500", "px-2")
// → "py-2 bg-blue-500 px-2" (px-4 nadpisane przez px-2)
```

Używa: `clsx` + `tailwind-merge`.

---

## formatters.ts

**Plik:** `src/lib/formatters.ts`

Formatowanie walut i dat dla polskiego rynku.

### `formatCurrency(amount, currency?)`

Formatuje kwotę do polskiego formatu PLN.

```ts
formatCurrency(1500)          // "1 500,00 zł"
formatCurrency(1500, "EUR")   // "1 500,00 €"
```

Używa `Intl.NumberFormat("pl-PL", { style: "currency" })`.

### `formatDate(date)`

Formatuje datę do formatu DD.MM.YYYY.

```ts
formatDate(new Date("2026-04-01"))  // "01.04.2026"
formatDate("2026-04-01")            // "01.04.2026"
```

### `toMonthKey(date)`

Konwertuje datę na klucz miesiąca.

```ts
toMonthKey(new Date("2026-04-15"))  // "2026-04"
```

### `monthLabel(key)`

Konwertuje klucz miesiąca na polską etykietę.

```ts
monthLabel("2026-04")  // "kwi 2026"
monthLabel("2026-01")  // "sty 2026"
```

Używa `date-fns` z locale `pl`.

---

## csv-parser.ts

**Plik:** `src/lib/csv-parser.ts`

Parser CSV z polskich banków (różne formaty).

### `parseCSV(content: string): ParsedTransaction[]`

Parsuje zawartość pliku CSV.

**Obsługiwane formaty dat:**
- `YYYY-MM-DD` (ISO)
- `DD.MM.YYYY` (polska)
- `DD-MM-YYYY`

**Obsługiwane separatory:**
- `;` (typowy dla polskich banków: PKO, mBank, ING)
- `,` (format angielski)

**Obsługiwane formaty kwot:**
- `1 234,56` (spacja jako separator tysięcy)
- `1.234,56` (kropka jako separator tysięcy)
- `-245,00` (ujemna = EXPENSE)
- `245,00` (dodatnia = INCOME)

**Zwraca:**
```ts
[{
  date: Date,
  amount: number,        // Zawsze dodatnia
  description: string,
  type: "INCOME" | "EXPENSE"
}]
```

**Logika INCOME/EXPENSE:**
- Kwota ujemna w CSV → EXPENSE
- Kwota dodatnia → INCOME
- Opis zawierający słowa kluczowe ("przelew wychodzący") → EXPENSE

---

## parse-transaction.ts

**Plik:** `src/lib/parse-transaction.ts`

Parser naturalnego języka dla szybkiego wpisywania transakcji (wersja mobile).

### `parseTransactionInput(raw: string)`

Przetwarza swobodnie wpisany tekst na strukturę transakcji.

**Przykłady wejścia:**
```
"500 zł marketing"
"faktura 1200"
"przychód 3000 od klienta"
"-245 subskrypcja"
```

**Algorytm:**
1. Regex ekstrakcja kwoty: `/(\d+[\s,.]?\d*)\s*zł?/i` lub `/^-?\d+/`
2. Klasyfikacja INCOME z słów kluczowych: `przychód`, `wpłata`, `faktura`, `sprzedaż`
3. Klasyfikacja EXPENSE z słów kluczowych: `koszt`, `zakup`, `opłata`, `faktura kosztowa`
4. Domyślnie: ujemna kwota → EXPENSE, dodatnia → INCOME

**Zwraca:**
```ts
{
  amount: number,
  type: "INCOME" | "EXPENSE",
  description: string,
  confidence: number    // 0.0–1.0
}
```

### `formatPLN(amount)`

Krótki formatter PLN do wyświetlania w mobile.

```ts
formatPLN(1500)   // "1 500 zł"
```

### `formatDateShort(date)`

Format daty skrócony dla mobile.

```ts
formatDateShort(new Date())              // "01.04"
formatDateShort(new Date("2025-12-15")) // "15.12.25"
```

---

## disclosure.ts

**Plik:** `src/lib/disclosure.ts`

System gamifikacji — stopniowe odblokowywanie funkcji.

Szczegółowy opis: [lib/disclosure.md](./disclosure.md)
