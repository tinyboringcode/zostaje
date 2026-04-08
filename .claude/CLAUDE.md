# zostaje. — Instrukcje dla Claude

## Filozofia produktu

zostaje. to odpowiedz na jedno pytanie: **ile realnie zostaje mi z tego co zarobilem?**

Nie dashboard. Nie kolejne narzedzie SaaS. Lokalny, zaszyfrowany skarbiec finansow JDG —
w stylu Obsidian, ale dla pieniedzy.

### Zasady ktorych nie lam przy zadnej nowej funkcji:

1. **Jedna liczba na wierzchu** — glowny widok pokazuje "zostaje po ZUS i podatkach".
   Wszystko inne jest drill-down.
2. **Command Palette first** — kazda akcja musi byc dostepna przez Cmd+K.
   Jesli nie jest, to nie jest gotowa.
3. **Free jest kompletny** — zadna funkcja finansowa nie idzie za paywall.
   Pro = sync serwer Boring Code, nie dostep do funkcji.
4. **Niewidzialne narzedzie** — aplikacja ma nie ciazyc. Zero friction.
   Uzytkownik wchodzi, dodaje transakcje, wychodzi. Aplikacja robi reszte w tle.
5. **Dane naleza do uzytkownika** — plik `.zostaje` jest jego, nie nasz.
   Serwer nigdy nie widzi plaintextu (E2E). Bez konta mozna uzywac w pelni.
6. **Ukryte super-funkcje** — graf powiazan, silnik regul, pluginy, audit log
   istnieja ale nie narzucaja sie. Odkrywasz je kiedy chcesz.

---

## Model biznesowy

zostaje. dziala jak Obsidian:

- **Free + Desktop (Electron):** pelne funkcje, dane lokalnie, zero konta.
  Sync = uzytkownik sam wrzuca plik `.zostaje` do Google Drive / iCloud / OneDrive.

- **Pro (29 zl/mc lub rocznie):** serwer sync Boring Code — wygoda bez konfiguracji.
  Automatyczny backup, multi-device, priorytetowy support.

**ProGate NIGDY nie blokuje funkcji finansowych.**
Jedyna rzecz za paywallem = convenience sync przez nasz serwer.
Jesli implementujesz nowa funkcje — idzie do Free. Jesli to jest "sync przez nasz serwer" — idzie do Pro.

---

## Projekt

Aplikacja finansowa dla polskich JDG (Jednoosobowa Dzialalnosc Gospodarcza).
Core loop: dodaj transakcje → zostaje. liczy ZUS + PIT → pokazuje ile realnie zostaje.

**Stack:** Next.js 14 · Prisma 5 + SQLite (legacy API) · **Local-first: IndexedDB (idb) + AES-GCM vault** · HeroUI v2 · TanStack Query · TypeScript · Tailwind CSS · Zustand · cmdk

> **Local-first refactor:** Aplikacja przechodzi na architekture local-first. Nowe dane uzytkownika zyja w zaszyfrowanym skarbcu IndexedDB (`src/lib/storage.ts`). Prisma/SQLite pozostaje tylko dla istniejacych endpointow, ktore beda stopniowo migrowane.

---

## Zasady nawigacji i UI

### Sidebar — max 5 pozycji w primary nav

Docelowa hierarchia:
- **Przeglad** (dashboard — jedna liczba, drill-down)
- **Transakcje**
- **Kontrahenci**
- **Raporty**
- **Ustawienia**

Wszystko inne (Kategorie, Reguly, Graf, Projekty, Faktury, Historia finansowa, Pluginy,
Baza wiedzy, Demo AI, Podatki) — dostepne przez Command Palette lub zagniezdzone
w Ustawieniach / odpowiednich sekcjach.

### Command Palette — serce aplikacji

Cmd+K (lub `/` poza inputami) musi obslugiwac:
- Dodaj transakcje (przychod / wydatek)
- Szybki przeglad miesieczny
- Szukaj kontrahenta
- Sprawdz ZUS / podatek
- Przejdz do dowolnej strony
- Akcje na wybranym rekordzie (edytuj, usun, duplikuj)

### Glowny widok (Przeglad)

- Jedna duza liczba: "zostaje" (po ZUS i PIT)
- Breakdown na hover lub klik: przychody, wydatki, ZUS+PIT
- Alerty (faktury po terminie, zblizajacy sie termin ZUS)
- "Pokaz wiecej wskaznikow" — collapse/expand, nie osobna strona
- Przyciski akcji: "Dodaj transakcje" + shortcut klawiaturowy widoczny obok

---

## Skarbiec lokalny (local-first)

Caly nowy kod dostepu do danych MUSI isc przez `src/lib/storage.ts`. Nie wolaj bezposrednio IndexedDB ani `src/lib/db.ts` — warstwa `storage` doklada szyfrowanie AES-GCM i audit log.

**Moduly:**
- `src/lib/crypto.ts` — Web Crypto API: `deriveKey`, `encrypt`, `decrypt`, `EncryptionError`. Zero zewnetrznych zaleznosci kryptograficznych. PBKDF2-SHA256 310 000 iteracji, AES-GCM 256, 12-bajtowy IV.
- `src/lib/db.ts` — JEDYNY modul dotykajacy IndexedDB (baza `zostaje-db`, stores: `transactions`, `kontrahenci`, `settings`, `audit_log`, `meta`).
- `src/lib/keystore.ts` — zarzadza kluczem sesji. Klucz zyje w zmiennej modulu, NIGDY nie trafia do localStorage/sessionStorage/IndexedDB. Sol w localStorage (nie jest sekretem). Token weryfikacyjny w `meta` store.
- `src/lib/storage.ts` — publiczne API CRUD: `getAll`, `getById`, `add`, `update`, `remove`, `snapshot`, `replaceAll`, `mergeAll`. Kazdy write loguje zmiane.
- `src/lib/audit.ts` — zaszyfrowany audit log (`logChange`, `listAudit`, `clearAudit`).
- `src/lib/vault-export.ts` — eksport/import JSON i `.zostaje` (z wlasna sola per plik).
- `src/lib/types.ts` — domenowe typy danych: `Transaction`, `TransactionDraft`, `Kontrahent`, `Project`, `Rule`, `RuleCondition`, `RuleAction`.
- `src/lib/plugins.ts` — minimalny system hookow: `registerPlugin`, `runHook`, `setPluginEnabled`, `listPlugins`. Hooki: `transaction:before-save`, `transaction:after-save`, `transaction:before-delete`, `import:after-csv`, `report:render`. Kazdy handler uruchamiany jest w try/catch — wyjatek pluginu NIGDY nie lamie hosta.
- `src/lib/rules.ts` — silnik regul (czyste funkcje): `applyRules`, `matchesRule`, `countMatches`, `starterRules`. Reguly sortowane po `priority`, pierwsza dopasowana wygrywa (chyba ze `cascade: true`).
- `src/lib/projects.ts` — CRUD projektow + `summarize`, `transactionsForProject`.
- `src/plugins/rules-plugin.ts` — core plugin, hook `transaction:before-save`, stosuje reguly uzytkownika i inkrementuje `match_count`.
- `src/plugins/audit-plugin.ts` — core plugin, hooki `transaction:after-save` i `transaction:before-delete`, pisze audit log.
- `src/plugins/sync-plugin.ts` — core plugin (Pro only), planuje `scheduleAutoPush()` po kazdej mutacji transakcji. No-op gdy `isPro() === false`.
- `src/plugins/index.ts` — `bootstrapPlugins()` rejestruje core pluginy i seeduje starter rules przy pierwszym odblokowaniu.
- `src/lib/graph.ts` — builder grafu powiazan (transakcje <-> kontrahenci <-> projekty <-> kategorie <-> tagi). Limit 500 transakcji, `buildGraph(filters)`, `nodeColor`, `nodeRadius`.
- `src/lib/pro.ts` — plan gate: `getPlan`, `isPro`, `fetchPlan` (GET `/api/auth/me`). Cache w `sessionStorage`. `features.*` mapuja na `isPro()`.
- `src/lib/sync.ts` — E2E encrypted sync (Pro): `pushSync`, `pullSync`, `scheduleAutoPush` (debounced), `autoSync`, `readSyncStatus`. Caly `snapshot()` szyfrowany jako jeden blob, last-write-wins po `updatedAt`. Dispatchuje `zostaje:sync-status` CustomEvent.
- `src/lib/electron-vault.ts` — utilities dla pliku skarbca na dysku (Electron IPC): `isDesktop()`, `getVaultFilePath()`, `saveVaultToFile()`, `loadVaultFromFile()`, `vaultFileExists()`.

**UI:**
- `src/components/vault/VaultProvider.tsx` — owija aplikacje, sprawdza stan zamka, auto-lock po 30 min bezczynnosci, wywoluje `bootstrapPlugins()` po odblokowaniu. W web: Pro gate (free plan = upgrade screen).
- `src/components/vault/LockScreen.tsx` — ekran blokady / setupu (przy pierwszym uruchomieniu prosi o ustawienie hasla).
- `src/components/vault/CommandPalette.tsx` — paleta komend, trigger `Cmd/Ctrl+K` oraz `/` (poza inputami).
- `src/components/vault/VaultSettingsSection.tsx` — eksport, import, historia zmian w Ustawieniach.
- `src/components/vault/PluginsSection.tsx` — lista aktywnych pluginow + toggle + instalator pluginow spolecznosci z dialogiem uprawnien.
- `src/components/rules/RulesClient.tsx` — lista/edytor regul (`/rules`), live preview dopasowan.
- `src/components/projects/ProjectsClient.tsx` — lista projektow (`/projects`) z sumami per projekt.
- `src/components/projects/ProjectDetailClient.tsx` — szczegoly projektu (`/projects/[id]`), transakcje, status.
- `src/components/graph/GraphView.tsx` — graf powiazan `/graph` (d3-force, drag/zoom, hover highlight, detail panel). Empty state przy 0 danych, ostrzezenie przy truncacji.
- `src/components/sync/SyncStatusIndicator.tsx` — kropka + label w stopce sidebara (widoczne tylko dla Pro). Reaguje na `zostaje:sync-status`.
- `src/components/ProGate.tsx` — owija feature gatingiem (upgrade card, NIGDY nie ukrywa funkcji calkowicie; `preview` opcjonalnie pokazuje dzieci przy opacity 40%).
- `src/components/pwa/InstallPrompt.tsx` + `AppInstallSection.tsx` — toast instalacji PWA (`beforeinstallprompt`) + sekcja w Ustawieniach z instrukcjami per-browser.

**Zasady:**
- Hasla nie da sie odzyskac. Bez niego dane sa nie do odszyfrowania — tak z definicji.
- `keystore.getKey()` rzuca wyjatkiem, gdy skarbiec jest zablokowany. Komponenty uzywaja `useVault()`.
- Wszystkie bledy deszyfrowania to `EncryptionError` z `src/lib/crypto.ts`.
- Strict TypeScript: nie obchodz typow `any`-em. Rzutowania `as BufferSource` sa OK tylko przy wywolaniach `crypto.subtle.*` (DOM lib miesza `Uint8Array<ArrayBufferLike>` z `BufferSource`).
- **Nie modyfikuj:** `crypto.ts`, `keystore.ts`, `zus-2026.ts`, `rules.ts`. To stabilne fundamenty. `plugins.ts` mozna rozszerzac (np. manifest, sandboxed context), ale nie zmieniaj istniejacych sygnatur `runHook`/`registerPlugin`.
- **Pluginy spolecznosci dostaja tylko `PluginContext`** z `createPluginContext(manifest, storageApi)`. Nigdy nie maja dostepu do raw IndexedDB, klucza szyfrowania ani innych pluginow. Uprawnienia z manifestu filtruja, jakie metody w kontekscie sa w ogole obecne.
- **ProGate nigdy nie blokuje funkcji finansowych** — upgrade card zacheca do Pro, ale tylko w kontekscie sync/convenience. Kazda funkcja finansowa jest dostepna w Free.
- **Graf ma limit 500 transakcji** — wieksze zbiory sa truncowane z ostrzezeniem w UI. d3 to jedyna ciezka zaleznosc wykresu; nie dokladaj innych.
- **Sync jest E2E:** caly `snapshot()` szyfrowany lokalnie kluczem sesji, zanim opusci urzadzenie. Serwer nigdy nie widzi plaintextu. Merge = last-write-wins po `updatedAt`.
- **Silnik regul musi byc czysty:** `applyRules` nigdy nie mutuje inputu. Efekty uboczne (audit, inkrementacja `match_count`) ida przez `onMatch` callback albo plugin.
- **Pluginy NIGDY nie lamia hosta:** kazdy `runHook` jest opakowany w try/catch. Wyjatek w handlerze loguje sie, pipeline kontynuuje z poprzednim payloadem.
- **Transakcje audytowane przez plugin** (`audit-plugin`), nietranzakcyjne byty (kontrahent/projekt/regula/ustawienia) wciaz logowane bezposrednio w `storage.ts` — hook surface jest minimalny.

## System autoryzacji

### Web (przegladarka)
- `src/server/auth.ts` — PBKDF2-SHA256 (310k iter), HMAC-SHA256 sesje, `timingSafeEqual`
- `src/middleware.ts` — Web Crypto HMAC weryfikacja (Edge-compatible), security headers, Electron bypass
- Session cookie: `session` (httpOnly, sameSite=lax, 30 dni)
- Electron UA (`Electron/XX`) omija calkowicie auth webowe — skarbiec to jedyna autoryzacja
- Endpointy: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`

### Desktop (Electron)
- `electron/main.ts` — IPC handlers dla vault file (`vault:get-path`, `vault:save`, `vault:load`)
- `electron/preload.ts` — `window.zostaje.vault.*` API
- `src/lib/electron-vault.ts` — browser-safe utilities
- `src/types/zostaje.d.ts` — globalne typy `window.zostaje`

## Kluczowe zasady kodu

### API routes (`src/app/api/**/route.ts`)
- **Zawsze** zaczynaj od `export const dynamic = "force-dynamic";` — bez tego Next.js 14 crashuje przy buildzie z SQLite
- Uzywaj `await req.json().catch(() => ({}))` zamiast `await req.json()` — bezpieczniejsze
- Zwracaj bledy jako `{ error: "opis" }` ze statusem 4xx/5xx
- Waliduj input przed zapisem do bazy

### Komponenty React
- Strony (`page.tsx`) — Server Components, importuja komponent kliencki
- Logika UI — w dedykowanym `*Client.tsx` z dyrektywa `"use client"`
- Wszystkie API calls przez **TanStack Query** (`useQuery` / `useMutation`)
- Powiadomienia toast przez **Sonner** (`toast.success`, `toast.error`)

### UI Framework — HeroUI v2 (nie v3!)
- **v3 jest niekompatybilny z Next.js 14** — zawsze `@heroui/react@2`
- `useDisclosure()` dla modali
- `Select`: uzywaj `key` na `SelectItem`, NIE `value`
- Klasy CSS: `.glass`, `.glow-hover`, `.gradient-text`, `.animate-fade-in`, `.animate-slide-up`

### Prisma
- Singleton klient: `import { prisma } from "@/server/db"`
- Settings to singleton o `id=1` — zawsze `findUnique({ where: { id: 1 } })`
- Migracje: `npm run db:migrate` (dev), `npm run db:push` (szybko bez migracji)
- **Prisma 5** — nie migruj do v7 (wymaga adaptera)

### Importy i sciezki
- Alias `@/` = `src/`
- `cn()` z `@/lib/utils` (clsx + tailwind-merge)
- `formatCurrency`, `formatDate`, `monthLabel` z `@/lib/formatters`
- Kod serwerowy (Node.js/Prisma): `@/server/*`
- Kod wspoldzielony (dziala tez w przegladarce): `@/lib/*`

---

## Architektura

```
src/app/(app)/        # Strony z sidebarem (layout.tsx)
src/app/(site)/       # Landing, auth, account
src/app/(marketing)/  # Pricing, download, sync info
src/app/m/            # Wersja mobilna
src/app/api/          # REST API endpoints (legacy, migracja do storage w toku)
src/components/       # Komponenty UI (layout/, dashboard/, vault/, etc.)
src/components/vault/ # Lock screen, VaultProvider, CommandPalette, sekcja Ustawien
src/server/           # Kod serwerowy: db, auth, mailer, ksef, categorizer, fingerprint
src/lib/              # Kod wspoldzielony
  |- crypto.ts        # Web Crypto API (AES-GCM + PBKDF2) — NIE DOTYKAC
  |- db.ts            # IndexedDB wrapper (idb) — jedyny konsument IndexedDB
  |- keystore.ts      # Zarzadzanie kluczem sesji — NIE DOTYKAC
  |- storage.ts       # PUBLICZNE API CRUD (uzywaj tylko tego)
  |- audit.ts         # Zaszyfrowany audit log
  |- vault-export.ts  # Eksport/import (JSON oraz .zostaje)
  |- types.ts         # Typy domenowe (Transaction, Project, Rule, ...)
  |- plugins.ts       # Hook system + PluginManifest + createPluginContext
  |- rules.ts         # Silnik regul (pure functions) — NIE DOTYKAC
  |- projects.ts      # CRUD + summary dla projektow
  |- graph.ts         # Builder grafu powiazan (d3-force input)
  |- pro.ts           # Plan gate (free/pro) + feature flags
  |- sync.ts          # E2E encrypted sync (Pro): push/pull/auto
  |- electron-vault.ts # Electron vault file utilities
src/plugins/          # Core pluginy (rules, audit, sync) + example community plugin
src/types/            # Globalne deklaracje typow (window.zostaje)
electron/             # Electron main process + preload + IPC vault
prisma/               # Schema, migracje, seed (legacy)
```

### Dodawanie nowych funkcji

#### Checklist przed nowa funkcja

Zanim zaczniesz implementowac cokolwiek nowego, odpowiedz na te pytania:

- [ ] Czy ta funkcja pomaga odpowiedziec na "ile zostaje"?
- [ ] Czy jest dostepna przez Command Palette?
- [ ] Czy jest dostepna w planie Free?
- [ ] Czy dodaje pozycje do primary nav (jesli tak — przemysl dwa razy)?
- [ ] Czy jest "ukryta" dopoki uzytkownik jej nie potrzebuje?

Jesli ktoras odpowiedz Cie niepokoi — zatrzymaj sie i porozmawiaj z zalozycielem.

#### Nowy endpoint:
1. `src/app/api/[nazwa]/route.ts` z `export const dynamic = "force-dynamic"`
2. Handler GET/POST/PUT/DELETE z obsluga bledow
3. `await req.json().catch(() => ({}))` — zawsze

#### Nowa strona:
1. `src/app/(app)/[nazwa]/page.tsx` — importuje `*Client.tsx`
2. `src/components/[nazwa]/[Nazwa]Client.tsx` z `"use client"`
3. Dodaj do Command Palette w `CommandPalette.tsx`
4. Sidebar TYLKO jesli pasuje do 5 primary pozycji — inaczej Command Palette only

---

## Zmienne srodowiskowe

| Zmienna | Opis |
|---------|------|
| `DATABASE_URL` | Sciezka do pliku SQLite (np. `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Sekret sesji (HMAC-SHA256). **ZMIEN na produkcji!** |
| `PLAN` | `pro` albo `free` — plan dla Electron instancji. Domyslnie `free`. |
| `SYNC_TOKEN` | Bearer token wymagany przez `/api/sync` (Pro sync). Pusty = sync wylaczony. |
| `DOMAIN` | Domena dla Dockera/Traefika |

Pozostale konfiguracje (SMTP, Ollama, KSeF) — w tabeli `Settings` bazy danych, konfigurowane przez UI.

---

## Komendy

```bash
npm run dev           # Dev server na :3000
npm run build         # prisma generate + next build
npm run lint          # ESLint
npm run db:migrate    # npx prisma migrate dev
npm run db:push       # Sync bez migracji (dev-only)
npm run db:seed       # Demo data + domyslne kategorie
npm run db:studio     # Prisma Studio na :5555
npm run electron:dev  # Electron development
npm run electron:build # Build instalatory (dmg/exe/AppImage)
```

---

## Decyzje architektoniczne (nie zmieniaj bez powodu)

- **HeroUI v2** — v3 niezgodny z Next.js 14
- **Prisma 5** — v7 wymaga adaptera dla SQLite
- **SQLite** — single-user app, backup = skopiuj `dev.db`
- **Settings singleton (id=1)** — single-user JDG, upraszcza queries
- **`force-dynamic`** — SQLite wymaga runtime access, statyczne render crashuje
- **TanStack Query** — wszystkie API calls przez cache/refetch layer
- **Obsidian model** — Free kompletny, Pro = convenience sync
- **Command Palette first** — kazda akcja dostepna z klawiatury
- **Jedna liczba** — dashboard = "ile zostaje", reszta drill-down
