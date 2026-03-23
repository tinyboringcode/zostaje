# CashFlow JDG — Dokumentacja techniczna

## Spis treści
1. [Uruchomienie lokalne](#1-uruchomienie-lokalne)
2. [Struktura projektu](#2-struktura-projektu)
3. [Baza danych — modele Prisma](#3-baza-danych--modele-prisma)
4. [API Routes — kompletna lista](#4-api-routes--kompletna-lista)
5. [Jak dodać nowy API endpoint](#5-jak-dodać-nowy-api-endpoint)
6. [Jak dodać nową stronę](#6-jak-dodać-nową-stronę)
7. [Komponenty UI — konwencje](#7-komponenty-ui--konwencje)
8. [Konfiguracja zewnętrznych integracji](#8-konfiguracja-zewnętrznych-integracji)
9. [Zmienne środowiskowe](#9-zmienne-środowiskowe)
10. [Komendy developerskie](#10-komendy-developerskie)
11. [Architektura decyzyjna](#11-architektura-decyzyjna)

---

## 1. Uruchomienie lokalne

### Wymagania
- Node.js 18+
- npm 9+
- (opcjonalnie) Ollama dla AI

### Pierwsze uruchomienie

```bash
# 1. Sklonuj/pobierz projekt
cd boringcode-cashflow-app

# 2. Zainstaluj zależności
npm install

# 3. Skopiuj plik .env
cp .env.example .env
# Edytuj .env — DATABASE_URL jest już ustawiony poprawnie

# 4. Zainicjuj bazę danych
npx prisma migrate dev

# 5. Dodaj domyślne kategorie
npm run db:seed

# 6. Uruchom serwer deweloperski
npm run dev
```

Otwórz http://localhost:3000

### Przy kolejnych uruchomieniach

```bash
npm run dev
```

### Po zmianie schematu bazy

```bash
# Tworzy migrację i synchronizuje bazę
npx prisma migrate dev --name opisZmiany

# LUB szybko (bez migracji, dev-only)
npx prisma db push
```

---

## 2. Struktura projektu

```
src/
├── app/
│   ├── (app)/                    # Strony z layoutem (sidebar + header)
│   │   ├── layout.tsx            # Wrapper z sidebarem
│   │   ├── page.tsx              # Dashboard /
│   │   ├── transactions/         # /transactions
│   │   ├── import/               # /import
│   │   ├── contractors/          # /contractors i /contractors/[id]
│   │   ├── categories/           # /categories
│   │   ├── budgets/              # /budgets
│   │   ├── reports/              # /reports
│   │   ├── wskazniki/            # /wskazniki (KPIs)
│   │   ├── ai-demo/              # /ai-demo (symulator)
│   │   └── settings/             # /settings
│   ├── api/                      # REST API endpoints
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── settings/
│   │   ├── reports/
│   │   ├── contractors/
│   │   ├── ai/
│   │   ├── ksef/
│   │   ├── import/
│   │   ├── indicators/
│   │   ├── nip-lookup/
│   │   └── notifications/
│   └── onboarding/               # /onboarding (poza layoutem)
├── components/
│   ├── layout/                   # Sidebar, Header
│   ├── dashboard/                # DashboardClient, KPICards, Charts, AIAnalysis
│   ├── contractors/              # ContractorsClient, ContractorDetail
│   ├── indicators/               # IndicatorsClient
│   ├── ai-demo/                  # AIDemoClient
│   ├── import/                   # ImportClient
│   ├── settings/                 # SettingsClient
│   └── ui/                       # shadcn/ui (Button, Input, Card...)
├── lib/
│   ├── db.ts                     # Prisma singleton
│   ├── mailer.ts                 # Nodemailer + HTML templates
│   ├── ksef.ts                   # KSeF API client
│   ├── csv-parser.ts             # Parser PKO/mBank CSV
│   ├── formatters.ts             # formatCurrency, formatDate, monthLabel
│   └── utils.ts                  # cn() (clsx + tailwind-merge)
└── providers.tsx                 # HeroUIProvider + QueryClientProvider
prisma/
├── schema.prisma                 # Schema bazy danych
├── seed.ts                       # Domyślne kategorie
└── migrations/                   # Historia migracji SQL
```

---

## 3. Baza danych — modele Prisma

### Category
| Pole | Typ | Opis |
|------|-----|------|
| id | String | CUID |
| name | String | Nazwa kategorii |
| color | String | Hex color (#6366f1) |
| emoji | String | Emoji ikona |
| type | String | `"INCOME"` lub `"EXPENSE"` |
| isDefault | Boolean | Kategoria systemowa |
| isArchived | Boolean | Ukryta w UI |

### Transaction
| Pole | Typ | Opis |
|------|-----|------|
| id | String | CUID |
| amount | Float | Kwota (zawsze dodatnia) |
| date | DateTime | Data transakcji |
| description | String | Opis |
| contractor | String? | Nazwa kontrahenta (opcjonalnie) |
| type | String | `"INCOME"` lub `"EXPENSE"` |
| categoryId | String | FK → Category |

### Contractor
| Pole | Typ | Opis |
|------|-----|------|
| companyType | String | `JDG`, `SpZoo`, `SA`, `Spk`, `SKA`, `SC`, `other` |
| nip | String | 10 cyfr NIP |
| phonePrefix | String | Prefiks kraju (+48, +49...) |
| addressStreet/City/Postal/Country | String | Pola adresu |

### Settings (id=1, singleton)
Wszystkie ustawienia aplikacji. Singleton — zawsze `id=1`. Przechowuje:
- Profil firmy (companyName, nip, taxForm, isVatPayer...)
- Ollama AI (ollamaUrl, ollamaModel, ollamaEnabled)
- KSeF (ksefToken, ksefEnvironment, ksefEnabled)
- SMTP / email (smtpHost, smtpPort, smtpUser, smtpPass, smtpEnabled)
- Powiadomienia (budgetAlertEnabled, budgetAlertThreshold, notifyInterval)
- Digest email (digestEnabled, digestFrequency, digestDays)
- Numeracja faktur (invoiceTemplate, invoiceCounter)

---

## 4. API Routes — kompletna lista

### Dashboard
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/dashboard?month=YYYY-MM` | KPI + cashflow + topCategories |

### Transakcje
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/transactions?month=&type=&search=` | Lista z filtrami |
| POST | `/api/transactions` | Utwórz transakcję |
| PUT | `/api/transactions/[id]` | Edytuj transakcję |
| DELETE | `/api/transactions/[id]` | Usuń transakcję |
| POST | `/api/transactions/import` | Import CSV (FormData: file, categoryId) |

### Kategorie
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/categories` | Lista kategorii |
| POST | `/api/categories` | Utwórz kategorię |
| PUT | `/api/categories/[id]` | Edytuj |
| DELETE | `/api/categories/[id]` | Usuń |

### Budżety
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/budgets?month=YYYY-MM` | Budżety z wydatkami |
| POST | `/api/budgets` | Utwórz budżet |
| DELETE | `/api/budgets/[id]` | Usuń budżet |

### Ustawienia
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/settings` | Pobierz settings (upsert id=1) |
| PUT | `/api/settings` | Zapisz settings |

### Kontrahenci
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/contractors` | Lista z agregacją (totalAmount, unpaidAmount) |
| POST | `/api/contractors` | Utwórz kontrahenta |
| GET | `/api/contractors/[id]` | Szczegóły + faktury |
| PUT | `/api/contractors/[id]` | Edytuj kontrahenta |
| DELETE | `/api/contractors/[id]` | Usuń (cascade faktury) |
| POST | `/api/contractors/[id]/invoices` | Dodaj fakturę |
| PATCH | `/api/contractors/[id]/invoices` | Oznacz jako zapłaconą `{ invoiceId }` |
| DELETE | `/api/contractors/[id]/invoices?invoiceId=` | Usuń fakturę |

### AI
| Method | Path | Opis |
|--------|------|------|
| POST | `/api/ai/analyze` | Analiza miesiąca `{ month: "YYYY-MM" }` |
| POST | `/api/ai/categorize` | Auto-kategoria `{ description, amount }` |
| POST | `/api/ai/receipt` | OCR zdjęcia (FormData: image) |

### Import
| Method | Path | Opis |
|--------|------|------|
| POST | `/api/ksef/sync` | Synchronizacja KSeF `{ from, to }` |
| GET | `/api/import/scan-folder` | Lista plików CSV w folderze |
| POST | `/api/import/scan-folder` | Import z pliku `{ filePath, categoryId }` |

### Raporty
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/reports/monthly?year=` | Raport roczny (12 miesięcy) |
| GET | `/api/reports/export?month=` | Eksport CSV |

### Powiadomienia
| Method | Path | Opis |
|--------|------|------|
| POST | `/api/notifications/test` | Wyślij testowy email |
| POST | `/api/notifications/check-budgets` | Sprawdź budżety i wyślij alerty |
| POST | `/api/notifications/digest` | Wyślij raport P&L `{ force?: true }` |
| GET | `/api/notifications/logs` | Ostatnie 20 logów |

### Wskaźniki i lookup
| Method | Path | Opis |
|--------|------|------|
| GET | `/api/indicators` | Wszystkie wskaźniki finansowe |
| GET | `/api/nip-lookup?nip=XXXXXXXXXX` | Dane firmy z rejestru MF |

---

## 5. Jak dodać nowy API endpoint

### Przykład: `/api/invoices/summary`

**1. Utwórz plik route:**
```bash
mkdir -p src/app/api/invoices/summary
touch src/app/api/invoices/summary/route.ts
```

**2. Napisz handler:**
```typescript
// src/app/api/invoices/summary/route.ts
export const dynamic = "force-dynamic";  // WYMAGANE — wyłącza cache
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Odczytaj query params
  const month = req.nextUrl.searchParams.get("month");

  try {
    const invoices = await prisma.contractorInvoice.findMany({
      where: {
        // Twoja logika filtrowania
      },
    });

    return NextResponse.json({ invoices, total: invoices.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Walidacja
  if (!body.contractorId) {
    return NextResponse.json({ error: "contractorId jest wymagany" }, { status: 400 });
  }

  // Zapis do bazy
  const result = await prisma.contractorInvoice.create({
    data: { ...body },
  });

  return NextResponse.json(result, { status: 201 });
}
```

**3. Wywołaj z frontendu (TanStack Query):**
```typescript
// W komponencie React
const { data } = useQuery({
  queryKey: ["invoices-summary", month],
  queryFn: () => fetch(`/api/invoices/summary?month=${month}`).then(r => r.json()),
});

// Mutacja (POST/PUT/DELETE)
const mutation = useMutation({
  mutationFn: (data) => fetch("/api/invoices/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(async (r) => {
    if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
    return r.json();
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["invoices-summary"] });
    toast.success("Zapisano!");
  },
  onError: (e: Error) => toast.error(e.message),
});
```

### Zasady API routes
- `export const dynamic = "force-dynamic"` — **zawsze** na początku każdego route.ts
- Waliduj wejście przed zapisem do bazy
- Zwracaj spójne błędy: `{ error: "opis" }` ze statusem 4xx/5xx
- Używaj `await req.json().catch(() => ({}))` zamiast `await req.json()` — bezpieczniejsze

---

## 6. Jak dodać nową stronę

**1. Utwórz folder i plik page.tsx:**
```bash
# Strona wewnątrz layoutu (z sidebarem)
mkdir -p "src/app/(app)/moja-strona"
```

```typescript
// src/app/(app)/moja-strona/page.tsx
export const dynamic = "force-dynamic";
import { MojaSstronaClient } from "@/components/moja-strona/MojaStronaClient";

export default function MojaStronaPage() {
  return <MojaStronaClient />;
}
```

**2. Utwórz komponent kliencki:**
```typescript
// src/components/moja-strona/MojaStronaClient.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody } from "@heroui/react";

export function MojaStronaClient() {
  const { data } = useQuery({
    queryKey: ["moje-dane"],
    queryFn: () => fetch("/api/moj-endpoint").then(r => r.json()),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold gradient-text">Moja Strona</h1>
      <Card className="glass border-0" shadow="none">
        <CardBody>...</CardBody>
      </Card>
    </div>
  );
}
```

**3. Dodaj do nawigacji:**
```typescript
// src/components/layout/Sidebar.tsx
import { MojaIkona } from "lucide-react";

const navItems = [
  // ...existing items...
  { href: "/moja-strona", label: "Moja Strona", icon: MojaIkona },
  // ...
];
```

Powtórz to samo w `src/components/layout/Header.tsx` (tablica `navItems`).

---

## 7. Komponenty UI — konwencje

### HeroUI v2 (heroui.com) — główny UI framework
```typescript
// Podstawowe
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import { Chip, Tooltip, Spinner, Divider, Switch, Select, SelectItem, Slider } from "@heroui/react";

// Modal pattern
const { isOpen, onOpen, onOpenChange } = useDisclosure();
<Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="lg">
  <ModalContent>
    {(onClose) => (
      <>
        <ModalHeader>Tytuł</ModalHeader>
        <ModalBody>...</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Anuluj</Button>
          <Button color="primary" onPress={onClose}>OK</Button>
        </ModalFooter>
      </>
    )}
  </ModalContent>
</Modal>

// Select — NIE używaj value prop na SelectItem, tylko key
<Select selectedKeys={[value]} onSelectionChange={(keys) => setValue(Array.from(keys)[0])}>
  <SelectItem key="opcja1">Opcja 1</SelectItem>
  <SelectItem key="opcja2">Opcja 2</SelectItem>
</Select>
```

### shadcn/ui — dla prostszych elementów (forms w Settings)
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

### CSS klasy designu (globals.css)
```css
/* Glass morphism */
.glass           /* tło szkło + blur */
.glow-hover      /* hover: cień + translateY(-1px) */
.gradient-text   /* indigo→violet gradient text */
.sidebar-glass   /* sidebar glass */
.animate-fade-in /* fade in przy mount */
.animate-slide-up /* slide up przy mount */
```

### Kolory HeroUI
- `color="primary"` — indigo (#6366f1)
- `color="success"` — zielony (#22c55e)
- `color="danger"` — czerwony (#ef4444)
- `color="warning"` — pomarańczowy (#f59e0b)
- `color="secondary"` — fiolet (#8b5cf6)

---

## 8. Konfiguracja zewnętrznych integracji

### Ollama (lokalny AI)

```bash
# Instalacja Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pobierz model do analizy tekstu
ollama pull llama3.2

# Pobierz model do OCR (zdjęcia paragonów)
ollama pull llava

# Uruchom Ollama (domyślnie na :11434)
ollama serve
```

W aplikacji: **Ustawienia → Lokalne AI**
- URL: `http://localhost:11434`
- Model: `llama3.2` (analiza) lub `llava` (OCR)

### Email (SMTP)

W aplikacji: **Ustawienia → Powiadomienia e-mail**

**Gmail:**
1. Włącz 2FA w koncie Google
2. Wygeneruj App Password: konto Google → Bezpieczeństwo → Hasła do aplikacji
3. Ustawienia: Host `smtp.gmail.com`, Port `587`, User: twój email, Pass: app password

**Inne:**
- Outlook: `smtp.office365.com:587`
- ProtonMail Bridge: `127.0.0.1:1025`
- Mailtrap (testy): `sandbox.smtp.mailtrap.io:2525`

### KSeF (Krajowy System e-Faktur)

W aplikacji: **Ustawienia → KSeF**

1. Zaloguj się na https://ksef.mf.gov.pl
2. Pobierz token autoryzacyjny
3. Wybierz środowisko: **Testowe** (demo) lub **Produkcyjne**
4. Wklej token w Ustawienia → KSeF

### NIP Lookup (automatyczne dane firm)

Używa bezpłatnego publicznego API Ministerstwa Finansów (`wl-api.mf.gov.pl`).
**Nie wymaga klucza API** — działa od razu.
Ograniczenie: tylko firmy zarejestrowane w VAT.

---

## 9. Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `DATABASE_URL` | TAK | Ścieżka do pliku SQLite |
| `APP_PASSWORD` | NIE | Hasło dostępu (puste = wyłączone) |
| `NEXTAUTH_SECRET` | TAK | Sekret sesji (zmień na prod!) |
| `DOMAIN` | NIE | Domena dla Dockera/Traefika |

Wszystkie inne konfiguracje (SMTP, Ollama, KSeF) są przechowywane w tabeli `Settings` bazy danych i konfigurowane przez UI.

---

## 10. Komendy developerskie

```bash
# Uruchomienie dev
npm run dev               # http://localhost:3000

# Build produkcyjny
npm run build
npm run start

# Prisma — baza danych
npm run db:migrate        # npx prisma migrate dev
npm run db:seed           # Dodaj domyślne kategorie
npm run db:studio         # GUI bazy danych (http://localhost:5555)
npm run db:push           # Sync bez migracji (dev-only)

# Linting
npm run lint

# Reset bazy danych
rm prisma/dev.db
npx prisma migrate dev
npm run db:seed
```

---

## 11. Architektura decyzyjna

### Dlaczego HeroUI v2, nie v3?
HeroUI v3 używa Tailwind CSS 4 i ma inny API (compound components, brak `useDisclosure`, brak `color` prop). Jest **niezgodny z Next.js 14**. Instaluj zawsze `@heroui/react@2`.

### Dlaczego Prisma 5, nie 7?
Prisma 7 wymaga adaptera dla SQLite. Prisma 5 działa out-of-the-box.

### Dlaczego `export const dynamic = "force-dynamic"`?
Next.js 14 domyślnie próbuje statycznie renderować API routes. Baza SQLite wymaga runtime access — bez tej dyrektywy routes crashują przy buildzie.

### Dlaczego Settings jako singleton (id=1)?
Aplikacja jest single-user (JDG = 1 właściciel). Singleton upraszcza queries — zawsze `findUnique({ where: { id: 1 } })`.

### SQLite vs PostgreSQL
SQLite jest idealny dla single-user desktop-like app. Backup = skopiuj `dev.db`. Migracja do PostgreSQL: zmień `provider = "postgresql"` w schema.prisma i ustaw `DATABASE_URL` na connection string.

### Stack TanStack Query
Wszystkie API calls przez TanStack Query — automatyczne cache, refetch, optimistic updates. `queryKey` to identyfikator cache (array z parametrami). `invalidateQueries` odświeża po mutacji.
