# CashFlow JDG — Instrukcje dla Claude

## Projekt

Aplikacja finansowa dla polskich JDG (Jednoosobowa Działalność Gospodarcza). Zarządzanie transakcjami, budżetami, kontrahentami, fakturami, powiadomieniami e-mail i integracjami (KSeF, Ollama AI).

**Stack:** Next.js 14 · Prisma 5 + SQLite (legacy API) · **Local-first: IndexedDB (idb) + AES-GCM vault** · HeroUI v2 · TanStack Query · TypeScript · Tailwind CSS · Zustand · cmdk

> **Local-first refactor:** Aplikacja przechodzi na architekturę local-first. Nowe dane użytkownika żyją w zaszyfrowanym skarbcu IndexedDB (`src/lib/storage.ts`). Prisma/SQLite pozostaje tylko dla istniejących endpointów, które będą stopniowo migrowane.

---

## Skarbiec lokalny (local-first)

Cały nowy kod dostępu do danych MUSI iść przez `src/lib/storage.ts`. Nie wołaj bezpośrednio IndexedDB ani `src/lib/db.ts` — warstwa `storage` dokłada szyfrowanie AES-GCM i audit log.

**Moduły:**
- `src/lib/crypto.ts` — Web Crypto API: `deriveKey`, `encrypt`, `decrypt`, `EncryptionError`. Zero zewnętrznych zależności kryptograficznych. PBKDF2-SHA256 310 000 iteracji, AES-GCM 256, 12-bajtowy IV.
- `src/lib/db.ts` — JEDYNY moduł dotykający IndexedDB (baza `zostaje-db`, stores: `transactions`, `kontrahenci`, `settings`, `audit_log`, `meta`).
- `src/lib/keystore.ts` — zarządza kluczem sesji. Klucz żyje w zmiennej modułu, NIGDY nie trafia do localStorage/sessionStorage/IndexedDB. Sól w localStorage (nie jest sekretem). Token weryfikacyjny w `meta` store.
- `src/lib/storage.ts` — publiczne API CRUD: `getAll`, `getById`, `add`, `update`, `remove`, `snapshot`, `replaceAll`, `mergeAll`. Każdy write loguje zmianę.
- `src/lib/audit.ts` — zaszyfrowany audit log (`logChange`, `listAudit`, `clearAudit`).
- `src/lib/vault-export.ts` — eksport/import JSON i `.zostaje` (z własną solą per plik).
- `src/lib/types.ts` — domenowe typy danych: `Transaction`, `TransactionDraft`, `Kontrahent`, `Project`, `Rule`, `RuleCondition`, `RuleAction`.
- `src/lib/plugins.ts` — minimalny system hooków: `registerPlugin`, `runHook`, `setPluginEnabled`, `listPlugins`. Hooki: `transaction:before-save`, `transaction:after-save`, `transaction:before-delete`, `import:after-csv`, `report:render`. Każdy handler uruchamiany jest w try/catch — wyjątek pluginu NIGDY nie łamie hosta.
- `src/lib/rules.ts` — silnik reguł (czyste funkcje): `applyRules`, `matchesRule`, `countMatches`, `starterRules`. Reguły sortowane po `priority`, pierwsza dopasowana wygrywa (chyba że `cascade: true`).
- `src/lib/projects.ts` — CRUD projektów + `summarize`, `transactionsForProject`.
- `src/plugins/rules-plugin.ts` — core plugin, hook `transaction:before-save`, stosuje reguły użytkownika i inkrementuje `match_count`.
- `src/plugins/audit-plugin.ts` — core plugin, hooki `transaction:after-save` i `transaction:before-delete`, pisze audit log.
- `src/plugins/sync-plugin.ts` — core plugin (Pro only), planuje `scheduleAutoPush()` po każdej mutacji transakcji. No-op gdy `isPro() === false`.
- `src/plugins/index.ts` — `bootstrapPlugins()` rejestruje core pluginy i seeduje starter rules przy pierwszym odblokowaniu.
- `src/lib/graph.ts` — builder grafu powiązań (transakcje ↔ kontrahenci ↔ projekty ↔ kategorie ↔ tagi). Limit 500 transakcji, `buildGraph(filters)`, `nodeColor`, `nodeRadius`.
- `src/lib/pro.ts` — plan gate: `getPlan`, `isPro`, `fetchPlan` (GET `/api/auth/me`). Cache w `sessionStorage`. `features.*` mapują na `isPro()`.
- `src/lib/sync.ts` — E2E encrypted sync (Pro): `pushSync`, `pullSync`, `scheduleAutoPush` (debounced), `autoSync`, `readSyncStatus`. Cały `snapshot()` szyfrowany jako jeden blob, last-write-wins po `updatedAt`. Dispatchuje `zostaje:sync-status` CustomEvent.

**UI:**
- `src/components/vault/VaultProvider.tsx` — owija aplikację, sprawdza stan zamka, auto-lock po 30 min bezczynności, wywołuje `bootstrapPlugins()` po odblokowaniu.
- `src/components/vault/LockScreen.tsx` — ekran blokady / setupu (przy pierwszym uruchomieniu prosi o ustawienie hasła).
- `src/components/vault/CommandPalette.tsx` — paleta komend, trigger `Cmd/Ctrl+K` oraz `/` (poza inputami).
- `src/components/vault/VaultSettingsSection.tsx` — eksport, import, historia zmian w Ustawieniach.
- `src/components/vault/PluginsSection.tsx` — lista aktywnych pluginów + toggle + instalator pluginów społeczności z dialogiem uprawnień.
- `src/components/rules/RulesClient.tsx` — lista/edytor reguł (`/rules`), live preview dopasowań.
- `src/components/projects/ProjectsClient.tsx` — lista projektów (`/projects`) z sumami per projekt.
- `src/components/projects/ProjectDetailClient.tsx` — szczegóły projektu (`/projects/[id]`), transakcje, status.
- `src/components/graph/GraphView.tsx` — graf powiązań `/graph` (d3-force, drag/zoom, hover highlight, detail panel). Empty state przy 0 danych, ostrzeżenie przy truncacji.
- `src/components/sync/SyncStatusIndicator.tsx` — kropka + label w stopce sidebara (widoczne tylko dla Pro). Reaguje na `zostaje:sync-status`.
- `src/components/ProGate.tsx` — owija feature gatingiem (upgrade card, NIGDY nie ukrywa funkcji całkowicie; `preview` opcjonalnie pokazuje dzieci przy opacity 40%).
- `src/components/pwa/InstallPrompt.tsx` + `AppInstallSection.tsx` — toast instalacji PWA (`beforeinstallprompt`) + sekcja w Ustawieniach z instrukcjami per-browser.

**Zasady:**
- Hasła nie da się odzyskać. Bez niego dane są nie do odszyfrowania — tak z definicji.
- `keystore.getKey()` rzuca wyjątkiem, gdy skarbiec jest zablokowany. Komponenty używają `useVault()`.
- Wszystkie błędy deszyfrowania to `EncryptionError` z `src/lib/crypto.ts`.
- Strict TypeScript: nie obchodź typów `any`-em. Rzutowania `as BufferSource` są OK tylko przy wywołaniach `crypto.subtle.*` (DOM lib miesza `Uint8Array<ArrayBufferLike>` z `BufferSource`).
- **Nie modyfikuj:** `crypto.ts`, `keystore.ts`, `zus-2026.ts`, `rules.ts`. To stabilne fundamenty. `plugins.ts` można rozszerzać (np. manifest, sandboxed context), ale nie zmieniaj istniejących sygnatur `runHook`/`registerPlugin`.
- **Pluginy społeczności dostają tylko `PluginContext`** z `createPluginContext(manifest, storageApi)`. Nigdy nie mają dostępu do raw IndexedDB, klucza szyfrowania ani innych pluginów. Uprawnienia z manifestu filtrują, jakie metody w kontekście są w ogóle obecne.
- **ProGate nigdy nie ukrywa funkcji całkowicie** — zawsze pokazuje upgrade card (opcjonalnie z preview dzieci). Celem jest informowanie, nie blokowanie widoczności.
- **Graf ma limit 500 transakcji** — większe zbiory są truncowane z ostrzeżeniem w UI. d3 to jedyna ciężka zależność wykresu; nie dokładaj innych.
- **Sync jest E2E:** cały `snapshot()` szyfrowany lokalnie kluczem sesji, zanim opuści urządzenie. Serwer nigdy nie widzi plaintextu. Merge = last-write-wins po `updatedAt`.
- **Silnik reguł musi być czysty:** `applyRules` nigdy nie mutuje inputu. Efekty uboczne (audit, inkrementacja `match_count`) idą przez `onMatch` callback albo plugin.
- **Pluginy NIGDY nie łamią hosta:** każdy `runHook` jest opakowany w try/catch. Wyjątek w handlerze loguje się, pipeline kontynuuje z poprzednim payloadem.
- **Transakcje audytowane przez plugin** (`audit-plugin`), nietranzakcyjne byty (kontrahent/projekt/reguła/ustawienia) wciąż logowane bezpośrednio w `storage.ts` — hook surface jest minimalny.

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
- Singleton klient: `import { prisma } from "@/server/db"`
- Settings to singleton o `id=1` — zawsze `findUnique({ where: { id: 1 } })`
- Migracje: `npm run db:migrate` (dev), `npm run db:push` (szybko bez migracji)
- **Prisma 5** — nie migruj do v7 (wymaga adaptera)

### Importy i ścieżki
- Alias `@/` = `src/`
- `cn()` z `@/lib/utils` (clsx + tailwind-merge)
- `formatCurrency`, `formatDate`, `monthLabel` z `@/lib/formatters`
- Kod serwerowy (Node.js/Prisma): `@/server/*`
- Kod współdzielony (działa też w przeglądarce): `@/lib/*`

---

## Architektura

```
src/app/(app)/        # Strony z sidebarem (layout.tsx)
src/app/api/          # REST API endpoints (legacy, migracja do storage w toku)
src/components/       # Komponenty UI (layout/, dashboard/, vault/, etc.)
src/components/vault/ # Lock screen, VaultProvider, CommandPalette, sekcja Ustawień
src/server/           # Kod serwerowy (legacy): db, mailer, ksef, categorizer, fingerprint
src/lib/              # Kod współdzielony
  ├─ crypto.ts        # Web Crypto API (AES-GCM + PBKDF2) — NIE DOTYKAĆ
  ├─ db.ts            # IndexedDB wrapper (idb) — jedyny konsument IndexedDB
  ├─ keystore.ts      # Zarządzanie kluczem sesji — NIE DOTYKAĆ
  ├─ storage.ts       # PUBLICZNE API CRUD (używaj tylko tego)
  ├─ audit.ts         # Zaszyfrowany audit log
  ├─ vault-export.ts  # Eksport/import (JSON oraz .zostaje)
  ├─ types.ts         # Typy domenowe (Transaction, Project, Rule, …)
  ├─ plugins.ts       # Hook system + PluginManifest + createPluginContext
  ├─ rules.ts         # Silnik reguł (pure functions) — NIE DOTYKAĆ
  ├─ projects.ts      # CRUD + summary dla projektów
  ├─ graph.ts         # Builder grafu powiązań (d3-force input)
  ├─ pro.ts           # Plan gate (free/pro) + feature flags
  └─ sync.ts          # E2E encrypted sync (Pro): push/pull/auto
src/plugins/          # Core pluginy (rules, audit, sync) + example community plugin
src/components/graph/ # GraphView (d3-force)
src/components/sync/  # SyncStatusIndicator
src/components/pwa/   # InstallPrompt + AppInstallSection
prisma/               # Schema, migracje, seed (legacy)
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
| `SYNC_TOKEN` | Bearer token wymagany przez `/api/sync` (Pro sync). Pusty = sync wyłączony. |
| `PLAN` | `pro` albo `free` — ustawia plan zwracany z `/api/auth/me`. Domyślnie `free`. |

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
