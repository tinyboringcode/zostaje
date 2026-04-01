# Architektura projektu

## Struktura katalogów

```
src/
├── app/
│   ├── (app)/          # Strony aplikacji (z sidebarem, wymagają logowania)
│   ├── (marketing)/    # Strona marketingowa (landing page)
│   ├── api/            # REST API (Next.js Route Handlers)
│   ├── m/              # Wersja mobilna (osobny layout)
│   ├── login/          # Strona logowania
│   └── onboarding/     # Pierwsze uruchomienie
├── components/         # Komponenty React
├── contexts/           # React Contexts (Disclosure, Palette, Tour)
├── lib/                # Kod współdzielony (działa w przeglądarce i na serwerze)
├── server/             # Kod wyłącznie serwerowy (Prisma, Nodemailer, KSeF)
├── middleware.ts        # Edge Middleware (auth, routing)
└── globals.css         # Globalne style Tailwind
```

---

## Przepływ żądania

```
Przeglądarka
    │
    ▼
middleware.ts          ← Sprawdza: auth cookie, mobile UA, onboarding
    │
    ├─ /login          ← Brak auth cookie
    ├─ /onboarding     ← Brak onboarding cookie
    ├─ /m/*            ← Mobilny user-agent na /
    │
    ▼
Next.js Router
    │
    ├─ page.tsx        ← Server Component (import *Client.tsx)
    │       │
    │       └─ *Client.tsx  ← "use client", TanStack Query
    │               │
    │               └─ fetch /api/...
    │
    └─ /api/*/route.ts  ← Route Handler (Node.js runtime)
            │
            └─ import { prisma } from "@/server/db"
                    │
                    └─ SQLite (dev.db)
```

---

## Wzorzec Page / Client

Każda strona aplikacji jest podzielona na dwa pliki:

**`src/app/(app)/[nazwa]/page.tsx`** — Server Component:
```tsx
// Nie ma "use client"
import { NazwaClient } from "@/components/nazwa/NazwaClient"
export default function NazwaPage() {
  return <NazwaClient />
}
```

**`src/components/nazwa/NazwaClient.tsx`** — Client Component:
```tsx
"use client"
import { useQuery, useMutation } from "@tanstack/react-query"
// Cała logika UI, wywołania API, stan lokalny
```

To rozdzielenie pozwala na:
- Server Components (SEO, szybszy pierwszy render)
- Client Components (interaktywność, TanStack Query, state)

---

## Wzorzec API Route

Każdy endpoint w `src/app/api/**/route.ts`:

```ts
export const dynamic = "force-dynamic";  // WYMAGANE — Next.js 14 + SQLite

export async function GET(req: Request) {
  try {
    const data = await prisma.model.findMany(...)
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: "Opis błędu" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))  // Bezpieczne parsowanie
  // Walidacja...
  // Zapis do bazy...
  return Response.json(result, { status: 201 })
}
```

---

## Przepływ danych (TanStack Query)

```
Komponent React
    │
    ├─ useQuery({ queryKey: ["transakcje"], queryFn: () => fetch("/api/transactions") })
    │       │
    │       └─ Cache TanStack Query (React Query DevTools)
    │
    └─ useMutation({ mutationFn: (data) => fetch("/api/transactions", { method: "POST", body }) })
            │
            └─ onSuccess: queryClient.invalidateQueries(["transakcje"])
                    │
                    └─ Automatyczne odświeżenie UI
```

---

## Powiązania między modułami

### Transakcje → Kategorie
- Każda transakcja `Transaction.categoryId` FK do `Category`
- `POST /api/transactions` wywołuje `categorizer.learnFromTransaction()` → aktualizuje wagi słów w `CategoryRule`
- UI pokazuje kolor i emoji kategorii przy każdej transakcji

### Transakcje → Kontrahenci
- `Transaction.contractorId` opcjonalne FK do `Contractor`
- `Transaction.invoiceId` opcjonalne FK do `ContractorInvoice` (uniq)

### Budżety → Kategorie
- `Budget` zawiera `categoryId` + `month` (YYYY-MM) + `limitAmount`
- Dashboard pobiera wydatki z `Transaction` i porównuje z `Budget.limitAmount`
- `POST /api/notifications/check-budgets` wysyła alert gdy przekroczono próg (domyślnie 80%)

### Ustawienia → Wszystko
- `Settings` (singleton `id=1`) zawiera konfigurację całej aplikacji
- `POST /api/settings` ustawia cookie `onboarding_done=1`
- Komponenty podatkowe (`TaxesClient`) pobierają `taxForm`, `zusStage`, `vatPeriod` z Settings
- `Mailer` pobiera SMTP config z Settings przed każdym wysłaniem

### Wskaźniki → Transakcje
- `GET /api/indicators` oblicza wszystkie metryki z historii `Transaction`
- `GET /api/patterns` analizuje wydatki z ostatnich 12 miesięcy
- `GET /api/fingerprint` porównuje bieżący miesiąc z baselineami (z-score)

### System odkrywania funkcji (Disclosure)
- `GET /api/system/progress` → `lib/disclosure.computeDisclosure(txCount, oldestDays)`
- `DisclosureContext` udostępnia `isUnlocked(feature)` wszystkim komponentom
- Sidebar pokazuje kłódkę przy zablokowanych sekcjach

---

## Warstwy kodu (izolacja)

| Warstwa | Ścieżka | Środowisko | Przykłady |
|---------|---------|------------|-----------|
| Shared lib | `src/lib/` | Browser + Node | formatters, utils, tax-calculator, csv-parser |
| Server-only | `src/server/` | Node.js only | db (Prisma), mailer, ksef, categorizer, fingerprint |
| UI Components | `src/components/` | Browser | React components |
| API Routes | `src/app/api/` | Node.js (Edge niedostępne) | Route Handlers |
| Pages | `src/app/(app)/` | Server render | Server Components |

Reguła: `src/lib/*` nie importuje z `src/server/*` (brak Node.js w przeglądarce).

---

## Stan aplikacji

### Stan serwera (TanStack Query)
- Wszystkie dane z API — w cache TanStack Query
- `queryKey` konwencja: `["transactions"]`, `["categories"]`, `["budgets", month]`
- Automatyczna inwalidacja po mutacjach

### Stan klienta (Zustand)
- Drobny stan UI (np. aktywny miesiąc, filtry)
- Nie jest persystowany między sesjami

### Stan globalny (React Context)
- `DisclosureContext` — odblokowane funkcje (cache z API)
- `PaletteContext` — aktywna paleta kolorów motywu
- `TourContext` — stan onboarding tour

---

## Bezpieczeństwo

- **Auth**: opcjonalne hasło via `APP_PASSWORD` env → cookie `auth=1`
- **Brak multi-user**: single-user JDG, brak ról
- **Settings**: chronione przez auth middleware
- **Walidacja**: każdy endpoint waliduje input przed zapisem
- **SQL injection**: niemożliwe — Prisma ORM z parametryzowanymi zapytaniami

---

## Deploy

Aplikacja jest Docker-ready:
- `Dockerfile` — multi-stage build
- `docker-compose.yml` — z Traefik labels dla HTTPS
- `DOMAIN` env → konfiguracja Traefika
- SQLite backup = skopiuj `prisma/dev.db`
