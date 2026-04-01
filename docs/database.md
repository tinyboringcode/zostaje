# Baza danych — Schemat Prisma

**Provider:** SQLite  
**Klient:** Prisma 5  
**Singleton:** `import { prisma } from "@/server/db"`

---

## Diagram relacji

```
Category ─────────────────┐
    │                      │
    │ 1:N                  │ 1:N
    ▼                      ▼
Transaction           Budget
    │
    │ N:1 (opcja)
    ▼
Contractor
    │
    │ 1:N
    ▼
ContractorInvoice ◄──── Transaction (1:1, opcjonalne)

Category ──── CategoryRule (słowa kluczowe ML)
Settings (singleton id=1)
NotificationLog (logi e-mail)
KSeFImport (deduplikacja)
```

---

## Model: Category

Kategoria transakcji (przychód lub koszt).

| Pole | Typ | Opis |
|------|-----|------|
| `id` | String (CUID) | PK |
| `name` | String | Nazwa kategorii |
| `color` | String | Kolor hex (domyślnie `#6366f1`) |
| `emoji` | String | Emoji (domyślnie `📁`) |
| `type` | Enum | `INCOME` lub `EXPENSE` |
| `isDefault` | Boolean | Kategoria systemowa (nieusuwalna) |
| `isArchived` | Boolean | Ukryta (zamiast usunięcia) |
| `mixedUsagePct` | Int | % odliczenia VAT/KUP: 100=pełne, 75=auto, 50=częściowe |
| `createdAt` | DateTime | Data utworzenia |

**Relacje:**
- `transactions` → `Transaction[]`
- `budgets` → `Budget[]`
- `categoryRules` → `CategoryRule[]`

**Uwagi:**
- Archiwizacja zamiast usunięcia (`isArchived=true`) — żeby nie tracić historii transakcji
- `mixedUsagePct` stosowany w kalkulatorze podatkowym do obliczenia odliczalnych kosztów

---

## Model: CategoryRule

Słownik ML do automatycznej kategoryzacji transakcji.

| Pole | Typ | Opis |
|------|-----|------|
| `id` | Int (autoincrement) | PK |
| `word` | String | Token (słowo kluczowe) |
| `categoryId` | String | FK → Category |
| `count` | Int | Liczba użyć (waga) |
| `txType` | Enum | `INCOME` lub `EXPENSE` |

**Unikalny indeks:** `(word, categoryId, txType)` — jeden token = jeden rekord na kategorię+typ.

**Jak działa:**
1. `POST /api/transactions` → `categorizer.learnFromTransaction()` tokenizuje opis
2. Każdy token inkrementuje `count` w odpowiednim `CategoryRule`
3. `POST /api/ai/categorize` → `categorizer.suggestCategory()` rankuje kategorie po sumie wag

---

## Model: Transaction

Główny model — każda transakcja finansowa.

| Pole | Typ | Opis |
|------|-----|------|
| `id` | String (CUID) | PK |
| `amount` | Float | Kwota (zawsze dodatnia) |
| `date` | DateTime | Data transakcji |
| `description` | String | Opis/tytuł |
| `type` | Enum | `INCOME` lub `EXPENSE` |
| `categoryId` | String? | FK → Category (opcjonalne) |
| `contractorId` | String? | FK → Contractor (opcjonalne) |
| `invoiceId` | String? | FK → ContractorInvoice (unique, opcjonalne) |
| `createdAt` | DateTime | Data dodania |

**Relacje:**
- `category` → `Category`
- `contractorRel` → `Contractor`
- `invoiceRel` → `ContractorInvoice`

**Uwagi:**
- `amount` jest zawsze dodatni — typ (`INCOME`/`EXPENSE`) determinuje kierunek
- `invoiceId` unique = jedna transakcja = jedna faktura (powiązanie płatności z FV)
- Transakcje są bazą dla wszystkich obliczeń: podatki, raporty, budżety, wskaźniki

---

## Model: Budget

Miesięczny limit wydatków dla kategorii.

| Pole | Typ | Opis |
|------|-----|------|
| `id` | String (CUID) | PK |
| `categoryId` | String | FK → Category |
| `month` | String | Format `YYYY-MM` |
| `limitAmount` | Float | Limit wydatków |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Unikalny indeks:** `(categoryId, month)` — jeden budżet na kategorię na miesiąc.

**Uwagi:**
- `POST /api/budgets` używa `upsert` — automatyczne tworzenie lub aktualizacja
- `check-budgets` porównuje sumę transakcji z `limitAmount` i wysyła alert

---

## Model: Contractor

Kontrahent — dostawca lub klient.

| Pole | Typ | Opis |
|------|-----|------|
| `id` | String (CUID) | PK |
| `name` | String | Nazwa firmy/osoby |
| `companyType` | Enum | `JDG`, `SpZoo`, `SA`, `Spk`, `SKA`, `other` |
| `nip` | String? | NIP (opcjonalne) |
| `email` | String? | E-mail kontaktowy |
| `phone` | String? | Numer telefonu |
| `phonePrefix` | String | Prefiks (domyślnie `+48`) |
| `street` | String? | Ulica i numer |
| `city` | String? | Miasto |
| `postal` | String? | Kod pocztowy |
| `country` | String? | Kraj |
| `address` | String? | Legacy — stary format adresu |
| `notes` | String? | Notatki |
| `createdAt` | DateTime | |

**Relacje:**
- `invoices` → `ContractorInvoice[]`
- `transactions` → `Transaction[]`

---

## Model: ContractorInvoice

Faktura wystawiona przez kontrahenta.

| Pole | Typ | Opis |
|------|-----|------|
| `id` | String (CUID) | PK |
| `contractorId` | String | FK → Contractor |
| `number` | String | Numer faktury |
| `amount` | Float | Kwota brutto |
| `issueDate` | DateTime | Data wystawienia |
| `dueDate` | DateTime | Termin płatności |
| `paidAt` | DateTime? | Data zapłaty (null = niezapłacona) |
| `status` | String | `pending`, `paid`, `overdue` |
| `notes` | String? | Notatki |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relacje:**
- `contractor` → `Contractor`
- `transaction` → `Transaction?` (1:1, opcjonalne — powiązanie z płatnością)

**Uwagi:**
- `check-budgets` automatycznie ustawia `status=overdue` gdy `dueDate < teraz && paidAt=null`

---

## Model: NotificationLog

Historia wysłanych powiadomień e-mail.

| Pole | Typ | Opis |
|------|-----|------|
| `id` | Int (autoincrement) | PK |
| `type` | String | `budget_alert`, `overdue_invoice`, `digest`, `test` |
| `subject` | String | Temat e-maila |
| `sentAt` | DateTime | Data wysłania |
| `success` | Boolean | Czy wysłano poprawnie |

---

## Model: Settings (Singleton)

Konfiguracja całej aplikacji. Zawsze jeden rekord: `id=1`.

### Dane firmy
| Pole | Typ | Domyślnie |
|------|-----|-----------|
| `companyName` | String | `"Moja Firma"` |
| `nip` | String | `""` |
| `address` | String | `""` |
| `currency` | String | `"PLN"` |
| `fiscalYearStart` | Int | `1` (styczeń) |
| `companyStartDate` | DateTime? | Data założenia (dla ZUS ulgi) |

### Konfiguracja podatkowa
| Pole | Typ | Opis |
|------|-----|------|
| `taxForm` | String | `linear`, `tax_scale`, `flat_rate` |
| `isVatPayer` | Boolean | Czy podatnik VAT |
| `ryczaltRate` | Float | Stawka ryczałtu (np. 12, 8.5, 3) |
| `zusStage` | String | `ulga_na_start`, `maly_zus`, `maly_zus_plus`, `full` |
| `vatPeriod` | String | `monthly`, `quarterly` |

### Ollama AI
| Pole | Typ | Opis |
|------|-----|------|
| `ollamaUrl` | String | URL do Ollama (np. `http://localhost:11434`) |
| `ollamaModel` | String | Model (llama3.2, llava, mistral, gemma2) |
| `ollamaEnabled` | Boolean | Czy AI aktywne |

### KSeF
| Pole | Typ | Opis |
|------|-----|------|
| `ksefToken` | String | Token API z portalu KSeF |
| `ksefEnvironment` | String | `test` lub `prod` |
| `ksefEnabled` | Boolean | Czy integracja aktywna |

### Watch Folder
| Pole | Typ | Opis |
|------|-----|------|
| `watchFolderPath` | String | Ścieżka do folderu z plikami CSV |
| `watchFolderEnabled` | Boolean | Czy monitoring aktywny |

### SMTP / E-mail
| Pole | Typ | Opis |
|------|-----|------|
| `notificationEmail` | String | Adres docelowy |
| `smtpHost` | String | Serwer SMTP |
| `smtpPort` | Int | Port (zazwyczaj 587) |
| `smtpUser` | String | Login SMTP |
| `smtpPass` | String | Hasło SMTP |
| `smtpEnabled` | Boolean | Czy e-mail aktywny |

### Alerty budżetowe
| Pole | Typ | Opis |
|------|-----|------|
| `budgetAlertEnabled` | Boolean | Czy alerty aktywne |
| `budgetAlertThreshold` | Int | Próg % (domyślnie 80) |
| `notifyInterval` | String | `immediate`, `daily`, `weekly` |
| `lastBudgetCheckAt` | DateTime? | Ostatnie sprawdzenie |

### Digest e-mail
| Pole | Typ | Opis |
|------|-----|------|
| `digestEnabled` | Boolean | Czy digest aktywny |
| `digestFrequency` | String | `daily`, `weekly`, `monthly` |
| `digestDays` | Int | Liczba dni wstecz |
| `lastDigestSentAt` | DateTime? | Ostatnie wysłanie |

### Numeracja faktur
| Pole | Typ | Opis |
|------|-----|------|
| `invoiceTemplate` | String | Wzorzec: `FV/{YYYY}/{NNN}` |
| `invoiceCounter` | Int | Aktualny numer (autoincrement) |

---

## Model: KSeFImport

Rejestr zaimportowanych faktur z KSeF (deduplikacja).

| Pole | Typ | Opis |
|------|-----|------|
| `id` | Int (autoincrement) | PK |
| `ksefNumber` | String (unique) | Unikalny numer KSeF |
| `importedAt` | DateTime | Data importu |

**Cel:** zapobiega podwójnemu importowi tej samej faktury przy kolejnych synchronizacjach.

---

## Konwencje Prisma

```ts
// Singleton klient
import { prisma } from "@/server/db"

// Settings — zawsze findUnique z id=1
const settings = await prisma.settings.findUnique({ where: { id: 1 } })

// Upsert budżetu
await prisma.budget.upsert({
  where: { categoryId_month: { categoryId, month } },
  update: { limitAmount },
  create: { categoryId, month, limitAmount }
})

// Archiwizacja kategorii (zamiast delete)
await prisma.category.update({
  where: { id },
  data: { isArchived: true }
})
```
