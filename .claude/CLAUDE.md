# CashFlow JDG — Instrukcje dla Claude

## Projekt

Aplikacja finansowa dla polskich JDG (Jednoosobowa Działalność Gospodarcza). Zarządzanie transakcjami, budżetami, kontrahentami, fakturami, powiadomieniami e-mail i integracjami (KSeF, Ollama AI).

**Stack:** Next.js 14 · Prisma 5 + SQLite · HeroUI v2 · TanStack Query · TypeScript · Tailwind CSS · Zustand

---

## Kluczowe zasady kodu

### API routes (`src/app/api/**/route.ts`)
- **Zawsze** zaczynaj od `export const dynamic = "force-dynamic";` — bez tego Next.js 14 crashuje przy buildzie z SQLite
- Używaj `await req.json().catch(() => ({}))` zamiast `await req.json()` — bezpieczniejsze
- Zwracaj błędy jako `{ error: "opis" }` ze statusem 4xx/5xx
- Waliduj input przed zapisem do bazy

### Komponenty React
- Strony (`page.tsx`) — Server Components, importują komponent kliencki
- Logika UI — w dedykowanym `*Client.tsx` z dyrektywą `"use client"`
- Wszystkie API calls przez **TanStack Query** (`useQuery` / `useMutation`)
- Powiadomienia toast przez **Sonner** (`toast.success`, `toast.error`)

### UI Framework — HeroUI v2 (nie v3!)
- **v3 jest niekompatybilny z Next.js 14** — zawsze `@heroui/react@2`
- `useDisclosure()` dla modali
- `Select`: używaj `key` na `SelectItem`, NIE `value`
- Klasy CSS: `.glass`, `.glow-hover`, `.gradient-text`, `.animate-fade-in`, `.animate-slide-up`

### Prisma
- Singleton klient: `import { prisma } from "@/lib/db"`
- Settings to singleton o `id=1` — zawsze `findUnique({ where: { id: 1 } })`
- Migracje: `npm run db:migrate` (dev), `npm run db:push` (szybko bez migracji)
- **Prisma 5** — nie migruj do v7 (wymaga adaptera)

### Importy i ścieżki
- Alias `@/` = `src/`
- `cn()` z `@/lib/utils` (clsx + tailwind-merge)
- `formatCurrency`, `formatDate`, `monthLabel` z `@/lib/formatters`

---

## Architektura

```
src/app/(app)/        # Strony z sidebarem (layout.tsx)
src/app/api/          # REST API endpoints
src/components/       # Komponenty UI (layout/, dashboard/, etc.)
src/lib/              # Utilities (db, mailer, ksef, csv-parser, formatters)
prisma/               # Schema, migracje, seed
```

### Dodawanie nowych funkcji

**Nowy endpoint:**
1. `src/app/api/[nazwa]/route.ts` z `export const dynamic = "force-dynamic"`
2. Handler GET/POST/PUT/DELETE z obsługą błędów

**Nowa strona:**
1. `src/app/(app)/[nazwa]/page.tsx` → importuje `*Client.tsx`
2. `src/components/[nazwa]/[Nazwa]Client.tsx` z `"use client"`
3. Dodaj do nawigacji w `Sidebar.tsx` i `Header.tsx`

---

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `DATABASE_URL` | Ścieżka do pliku SQLite (np. `file:./dev.db`) |
| `APP_PASSWORD` | Hasło dostępu (puste = wyłączone) |
| `NEXTAUTH_SECRET` | Sekret sesji |
| `DOMAIN` | Domena dla Dockera/Traefika |

Pozostałe konfiguracje (SMTP, Ollama, KSeF) — w tabeli `Settings` bazy danych, konfigurowane przez UI.

---

## Komendy

```bash
npm run dev           # Dev server na :3000
npm run build         # prisma generate + next build
npm run lint          # ESLint
npm run db:migrate    # npx prisma migrate dev
npm run db:push       # Sync bez migracji (dev-only)
npm run db:seed       # Domyślne kategorie
npm run db:studio     # Prisma Studio na :5555
```

---

## Decyzje architektoniczne (nie zmieniaj bez powodu)

- **HeroUI v2** — v3 niezgodny z Next.js 14
- **Prisma 5** — v7 wymaga adaptera dla SQLite
- **SQLite** — single-user app, backup = skopiuj `dev.db`
- **Settings singleton (id=1)** — single-user JDG, upraszcza queries
- **`force-dynamic`** — SQLite wymaga runtime access, statyczne render crashuje
- **TanStack Query** — wszystkie API calls przez cache/refetch layer
