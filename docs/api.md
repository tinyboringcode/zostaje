# API — Endpointy REST

Wszystkie endpointy: `src/app/api/**/route.ts`  
Każdy plik zaczyna się od `export const dynamic = "force-dynamic"`.

---

## Transakcje

### `GET /api/transactions`

Pobiera listę transakcji z filtrowaniem i paginacją.

**Query params:**
| Param | Typ | Opis |
|-------|-----|------|
| `page` | number | Numer strony (domyślnie 1) |
| `limit` | number | Wyniki na stronę (domyślnie 50) |
| `type` | string | `INCOME` lub `EXPENSE` |
| `categoryId` | string | Filtr kategorii |
| `dateFrom` | string | ISO date |
| `dateTo` | string | ISO date |
| `search` | string | Szukaj w opisie |
| `sortBy` | string | `date`, `amount`, `description` |
| `sortDir` | string | `asc`, `desc` |

**Odpowiedź:**
```json
{
  "items": [{ "id": "...", "amount": 1500, "date": "...", "description": "...", "type": "INCOME", "category": {...} }],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### `POST /api/transactions`

Tworzy nową transakcję i wywołuje uczenie kategoryzatora.

**Body:**
```json
{
  "amount": 1500,
  "date": "2026-04-01",
  "description": "Faktura za usługi",
  "type": "INCOME",
  "categoryId": "clx...",
  "contractorId": "clx...",
  "invoiceId": "clx..."
}
```

**Efekt uboczny:** `categorizer.learnFromTransaction()` — aktualizuje wagi słów w `CategoryRule`.

### `DELETE /api/transactions`

Masowe usuwanie transakcji.

**Body:**
```json
{
  "scope": "filtered",
  "dateRange": { "from": "2026-01-01", "to": "2026-03-31" },
  "type": "EXPENSE",
  "categoryId": "clx..."
}
```

### `GET /api/transactions/[id]`

Pojedyncza transakcja z relacjami (category, contractor, invoice).

### `PUT /api/transactions/[id]`

Aktualizacja transakcji.

### `POST /api/transactions/import`

Import z CSV. FormData: `file` (plik CSV), `categoryId` (domyślna kategoria).

---

## Kategorie

### `GET /api/categories`

Wszystkie aktywne kategorie (`isArchived=false`), posortowane: domyślne pierwsze, potem A-Z.

**Odpowiedź:**
```json
[{ "id": "...", "name": "Jedzenie", "color": "#6366f1", "emoji": "🍕", "type": "EXPENSE", "isDefault": false }]
```

### `POST /api/categories`

Tworzy nową kategorię.

**Body:** `{ name, type, color, emoji }`

### `GET /api/categories/[id]`

Pojedyncza kategoria.

### `PUT /api/categories/[id]`

Aktualizacja kategorii.

### `DELETE /api/categories/[id]`

Archiwizuje kategorię (`isArchived=true`). Nie usuwa fizycznie — zachowanie historii transakcji.

---

## Budżety

### `GET /api/budgets?month=YYYY-MM`

Budżety na dany miesiąc z danymi kategorii.

### `POST /api/budgets`

Upsert budżetu (tworzy lub aktualizuje).

**Body:** `{ categoryId, month, limitAmount }`

### `GET /api/budgets/[id]`

Pojedynczy budżet.

### `PUT /api/budgets/[id]`

Aktualizacja.

### `DELETE /api/budgets/[id]`

Usunięcie.

---

## Kontrahenci

### `GET /api/contractors`

Wszyscy kontrahenci z podsumowaniem faktur (suma, zaległa kwota, liczba przeterminowanych).

### `POST /api/contractors`

Tworzy kontrahenta.

**Body:** `{ name, companyType, nip, email, phone, phonePrefix, street, city, postal, country, notes }`

### `GET /api/contractors/[id]`

Kontrahent z fakturami.

### `PUT /api/contractors/[id]`

Aktualizacja.

### `DELETE /api/contractors/[id]`

Usunięcie (kaskadowe usunięcie faktur).

### `GET /api/contractors/[id]/invoices`

Faktury kontrahenta.

---

## Ustawienia

### `GET /api/settings`

Pobiera singleton Settings (auto-tworzy jeśli brak).

### `PUT /api/settings`

Aktualizuje wszystkie ustawienia. Ustawia cookie `onboarding_done=1`.

---

## Dashboard

### `GET /api/dashboard?month=YYYY-MM`

KPI i wykresy dla miesiąca.

**Odpowiedź:**
```json
{
  "kpi": {
    "income": 8500,
    "expense": 3200,
    "profit": 5300,
    "transactionCount": 42
  },
  "cashflow": [
    { "month": "2025-05", "income": 7000, "expense": 2800, "profit": 4200 }
  ],
  "topCategories": [
    { "name": "Marketing", "total": 1500, "color": "#f43f5e" }
  ]
}
```

---

## Podatki i ZUS

### `GET /api/taxes?month=YYYY-MM`

Obliczenia podatkowe YTD (od początku roku do podanego miesiąca).

**Odpowiedź:**
```json
{
  "ytdRevenue": 51000,
  "ytdCosts": 19200,
  "ytdProfit": 31800,
  "zusSocial": { "total": 1485.31, "emerytalne": 1015.78, ... },
  "healthInsurance": 1558.98,
  "pitAdvance": 3820,
  "monthlyBurden": 6864.29,
  "obligations": [
    { "type": "ZUS", "dueDate": "2026-04-20", "daysUntil": 19, "urgent": false }
  ]
}
```

### `POST /api/taxes/simulate`

Porównanie 3 form opodatkowania.

**Body:** `{ revenue, costs, zusStage, ryczaltRate }`

**Odpowiedź:** Tablica 3 wyników z `effectiveTaxRate`, `netIncome`, `totalBurden`.

---

## Wskaźniki biznesowe

### `GET /api/indicators`

Zaawansowane metryki z ostatnich 12 miesięcy.

**Odpowiedź:**
```json
{
  "runway": 8.5,
  "burnRate": 3200,
  "revenuePerClient": 2833,
  "concentrationRisk": 0.45,
  "seasonality": [...],
  "forecast": { "nextMonth": 5600, "confidence": 0.78 },
  "breakEven": 2100,
  "trend": "growing"
}
```

---

## Raporty

### `GET /api/reports/monthly?year=YYYY`

Miesięczny P&L dla roku.

**Odpowiedź:** `Record<"YYYY-MM", { income, expense, profit }>`

### `GET /api/reports/category?year=YYYY`

Rozkład wydatków wg kategorii dla roku.

### `GET /api/reports/export`

Eksport transakcji.

**Query:** `dateFrom`, `dateTo`, `type`, `format` (`csv` lub `xlsx`)

---

## Wzorce i anomalie

### `GET /api/patterns`

Analiza wzorców wydatków z ostatnich 12 miesięcy.

**Odpowiedź:**
```json
{
  "patterns": [
    {
      "categoryName": "Hosting",
      "avgMonthly": 150,
      "trend": "stable",
      "isRecurring": true,
      "peakMonth": "2025-12"
    }
  ],
  "topGrowingCosts": [...],
  "recurringFixed": [...],
  "cashflowVolatility": 0.23,
  "avgPaymentDelay": 12,
  "recommendations": ["Rozważ prepayment hostingu..."]
}
```

### `GET /api/fingerprint`

Wykrywanie anomalii (wymaga 60+ transakcji).

**Odpowiedź:**
```json
{
  "anomalies": [
    {
      "categoryName": "Marketing",
      "currentAmount": 4500,
      "expectedAmount": 1800,
      "zScore": 2.8,
      "severity": "strong"
    }
  ]
}
```

---

## AI (Ollama)

### `POST /api/ai/categorize`

Sugestia kategorii przez Ollama LLM.

**Body:** `{ description, amount, type }`

**Odpowiedź:** `{ categoryId, confidence }`

Wymaga: `ollamaEnabled=true` w Settings.

### `POST /api/ai/analyze`

Analiza wzorców transakcji (demo).

### `POST /api/ai/receipt`

OCR paragonu z obrazu (demo, wymaga modelu `llava`).

---

## Powiadomienia

### `POST /api/notifications/check-budgets`

Sprawdza budżety i zaległe faktury. Wysyła e-mail jeśli SMTP skonfigurowany.

- Alerty gdy wydatki > `budgetAlertThreshold`% limitu
- Ustawia `status=overdue` na przeterminowanych fakturach
- Respektuje `notifyInterval` (immediate/daily/weekly)

### `GET /api/notifications/logs`

Historia wysłanych e-maili z `NotificationLog`.

### `POST /api/notifications/test`

Testuje konfigurację SMTP — wysyła e-mail testowy.

### `POST /api/notifications/digest`

Wysyła digest (podsumowanie dzienne/tygodniowe/miesięczne).

---

## KSeF

### `POST /api/ksef/sync`

Synchronizuje faktury z KSeF (polskie e-faktury).

- Autentykacja przez `server/ksef.ts`
- Pomija już zaimportowane (tabela `KSeFImport`)
- Zwraca listę nowych faktur

---

## System

### `GET /api/health`

Health check. Odpowiedź: `{ status: "ok" }`.

### `GET /api/system/progress`

Status odkrywania funkcji.

**Odpowiedź:**
```json
{
  "txCount": 35,
  "oldestDays": 45,
  "unlocked": ["dashboard_basic", "categories", "budgets", "taxes", "reports_basic", "ai_suggestions"],
  "nextUnlock": { "feature": "wskazniki", "requiresTx": 20, "requiresDays": 14 },
  "progressPct": 62
}
```

### `POST /api/import/scan-folder`

Skanuje `watchFolderPath` w poszukiwaniu plików CSV do importu.

---

## Auth

### `POST /api/auth/login`

**Body:** `{ password }`

Ustawia cookie `auth=<token>` jeśli hasło poprawne.
