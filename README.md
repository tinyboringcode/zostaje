<div align="center">

```
 ______     ______     ______     ______   ______     __     ______
/\___  \   /\  __ \   /\  ___\   /\__  _\ /\  __ \   /\ \   /\  ___\
\/_/  /__  \ \ \/\ \  \ \___  \  \/_/\ \/ \ \  __ \  \ \ \  \ \  __\
  /\_____\  \ \_____\  \/\_____\    \ \_\  \ \_\ \_\  \ \_\  \ \_____\
  \/_____/   \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/   \/_____/
```

# zostaje.

**Ile realnie zostaje mi z tego co zarobilem?**

Lokalny, zaszyfrowany skarbiec finansow JDG — jak Obsidian, ale dla pieniedzy.
Jedno pytanie. Jedna liczba. Zero kompromisow z prywatnosciq.

[![License: FSL-1.1](https://img.shields.io/badge/License-FSL--1.1-blue.svg)](https://fsl.software/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://www.electronjs.org/)
[![Self-hostable](https://img.shields.io/badge/Self--host-Docker-2496ED?logo=docker)](https://www.docker.com/)

</div>

---

## Jak to dziala — w 30 sekund

1. Otwierasz aplikacje, ustawiasz haslo skarbca
2. Dodajesz transakcje (reczne, CSV z banku, albo OCR paragonu)
3. **zostaje.** liczy ZUS + PIT za Ciebie — automatycznie, w tle
4. Na gorze widzisz jedna liczbe: **ile realnie zostaje**
5. Dane nigdy nie opuszczaja Twojego urzadzenia (chyba ze sam chcesz sync)

To tyle. Reszta — kontrahenci, faktury, raporty, graf powiazan — odkrywasz kiedy potrzebujesz.

---

## Filozofia

### Jedno pytanie zamiast dashboardu

zostaje. nie jest "dashboardem finansowym". To narzedzie ktore odpowiada na jedno pytanie:
**ile realnie zostaje mi z tego co zarobilem — po ZUS, po PIT, po wszystkim.**

Wszystko inne jest drill-down z tej jednej liczby.

### Obsidian model

- **Free + Desktop:** pelne funkcje, dane lokalnie, zero konta, zero internetu
- **Pro (29 zl/mc):** serwer sync Boring Code — wygoda, multi-device, backup
- **Zadna funkcja finansowa nie jest za paywallem.** Pro = convenience sync, nie dostep do funkcji.

### Dane naleza do Ciebie

- Plik `.zostaje` jest Twoj — skopiuj go, wrzu na Google Drive, zrob backup
- Szyfrowanie AES-GCM-256 z kluczem z Twojego hasla (PBKDF2, 310k iteracji)
- Serwer nigdy nie widzi danych w postaci jawnej (E2E)
- Hasla nie da sie odzyskac — to celowe, nie bug

### Niewidzialne narzedzie

Aplikacja ma nie ciazyc. Wchodzisz, dodajesz transakcje, widzisz ile zostaje, wychodzisz.
Command Palette (`Cmd+K`) to serce interakcji — kazda akcja dostepna z klawiatury.

---

## Kluczowe funkcje

### Podatki i ZUS — to po co tu jestes

- **Kalkulator PIT:** liniowy 19%, skala podatkowa, ryczalt (stawki 2%-17%)
- **Kalkulator ZUS:** ulga na start, maly ZUS, maly ZUS+, pelny ZUS — stawki 2026
- Skladka zdrowotna wyliczana per forma opodatkowania
- Symulacja roznych scenariuszy — porownanie form opodatkowania side-by-side
- Sledzenie progu rejestracji VAT (200 000 PLN)
- Przypomnienia o terminach (ZUS do 20., JPK do 25.)
- **Jedna liczba na wierzchu:** przychod - wydatki - ZUS - PIT = **zostaje**

### Transakcje

- CRUD z automatyczna kategoryzacja (silnik regul + opcjonalnie AI przez Ollama)
- Import CSV z polskich bankow (mBank, ING, PKO, Santander i inne)
- Skanowanie paragonow (OCR przez Ollama z modelem llava)
- Wykrywanie duplikatow (fingerprinting)
- Blokada miesiecy (finalizacja zamknietych okresow)
- Obsluga walut obcych z przeliczeniem na PLN

### Faktury

- Faktury VAT, proforma i korekty
- Automatyczna numeracja (konfigurowalny szablon, np. `FV/{YYYY}/{NNN}`)
- Druk / generowanie PDF
- Integracja z **KSeF** (Krajowy System e-Faktur)
- Sledzenie statusow: wystawiona, wyslana, oplacona, przeterminowana, anulowana
- Stawki VAT: 23%, 8%, 5%, 0%, ZW

### Budzety

- Limity per kategoria per miesiac
- Alerty email przy przekroczeniu progu (domyslnie 80%)
- Dashboard z progressem wykorzystania

### Raporty

- Raport miesieczny: przychody, koszty, zysk netto
- Analiza kategoriowa wydatkow i przychodow
- Eksport JPK-V7M (VAT) — XML do Urzedu Skarbowego
- Wykresy trendow (Recharts)
- Digest email — automatyczne podsumowania

### Ukryte super-funkcje

Istnieja, ale nie narzucaja sie. Odkrywasz je kiedy chcesz:

- **Graf powiazan** — wizualizacja d3-force: transakcje, kontrahenci, projekty, kategorie
- **Silnik regul** — automatyczne tagowanie, kategoryzacja, przypisywanie do projektow
- **System pluginow** — rozszerzalnosc z izolacja bezpieczenstwa (sandboxed context)
- **Audit log** — zaszyfrowana historia kazdej zmiany
- **Command Palette** — pelne sterowanie z klawiatury (`Cmd+K`)
- **Projekty** — grupowanie transakcji w konteksty biznesowe

---

## Quick Start

### Wymagania

- **Node.js** 18+
- **npm** 9+
- *(opcjonalnie)* Docker do self-hostingu
- *(opcjonalnie)* [Ollama](https://ollama.ai/) do auto-kategoryzacji AI

### Instalacja

```bash
git clone https://github.com/1norahc/zostaje.git
cd zostaje
cp .env.example .env
npm install
npm run db:push
npm run db:seed   # domyslne kategorie + dane demo
npm run dev
```

Otworz [http://localhost:3000](http://localhost:3000)

### Konto demo

- **Email:** `demo@zostaje.app`
- **Haslo:** `demo1234`
- **Plan:** Pro (pelny dostep)

### Wersja desktopowa (Electron)

```bash
npm run electron:dev     # Development z hot-reload
npm run electron:build   # Build instalatorow (dmg/exe/AppImage)
```

---

## Jak to dziala pod spodem

### Architektura

**Desktop (Electron)** — darmowy, offline-first:
- Dane w zaszyfrowanym pliku `vault.zostaje` na dysku
- Brak konta, logowania, internetu
- Pelny dostep do wszystkich funkcji

**Web (przegladarka)** — wymaga konta:
- Rejestracja/logowanie przez sesje cookie (httpOnly, HMAC-SHA256)
- Plan free → upgrade screen, Plan pro → pelny dostep + sync E2E
- Dane w zaszyfrowanym skarbcu IndexedDB

### Przeplyw danych

1. Uzytkownik tworzy transakcje
2. **Plugin `rules-plugin`** stosuje reguly kategoryzacji (`transaction:before-save`)
3. Dane szyfrowane **AES-GCM-256** kluczem z hasla uzytkownika
4. Zapis do IndexedDB (web) lub pliku (Electron)
5. **Plugin `audit-plugin`** loguje zmiane
6. **Plugin `sync-plugin`** planuje push na serwer (tylko Pro)

Pipeline odporny na bledy — wyjatek w pluginie nie przerywa zapisu.

### Bezpieczenstwo (zero-knowledge)

- Haslo nigdy nie opuszcza urzadzenia — sluzy do derivowania klucza szyfrowania
- Klucz sesji zyje tylko w RAM (`keystore.ts`) — nie localStorage, nie IndexedDB
- PBKDF2-SHA256 (310k iteracji) + AES-GCM-256 (12-byte IV)
- E2E sync: serwer przechowuje wylacznie ciphertext
- Sesja: HMAC-SHA256 cookies, auto-lock po 30 min bezczynnosci
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

---

## Zmienne srodowiskowe

| Zmienna | Wymagana | Opis | Domyslna |
|---------|----------|------|----------|
| `DATABASE_URL` | Tak | Sciezka do pliku SQLite | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Tak (prod) | Sekret sesji (HMAC-SHA256) | `change-me-in-production` |
| `PLAN` | Nie | Plan instancji: `free` / `pro` | `free` |
| `SYNC_TOKEN` | Nie | Bearer token dla sync API (Pro) | *(puste = sync wylaczony)* |
| `DOMAIN` | Nie | Domena (Docker/Traefik) | — |

> SMTP, Ollama i KSeF konfiguruje sie przez UI w zakladce **Ustawienia**.

---

## Komendy

| Komenda | Opis |
|---------|------|
| `npm run dev` | Serwer deweloperski na :3000 |
| `npm run build` | Prisma generate + Next.js build |
| `npm run start` | Uruchomienie zbudowanej aplikacji |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync schematu bez migracji (dev-only) |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed demo + domyslne kategorie |
| `npm run db:studio` | Prisma Studio na :5555 |
| `npm run electron:dev` | Electron development |
| `npm run electron:build` | Build instalatorow (dmg/exe/AppImage) |

---

## Deployment (produkcja)

### Docker

```bash
docker build -t zostaje .
docker run -p 3000:3000 \
  -e DATABASE_URL="file:/data/finance.db" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e PLAN=pro \
  -e SYNC_TOKEN="$(openssl rand -hex 32)" \
  -v zostaje-data:/data \
  zostaje
```

### Traefik (opcjonalnie)

Automatyczny HTTPS z Let's Encrypt. Ustaw `DOMAIN` w `.env`.

```yaml
# docker-compose.yml — fragment
services:
  app:
    image: zostaje:latest
    environment:
      - DATABASE_URL=file:/data/finance.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - PLAN=pro
      - SYNC_TOKEN=${SYNC_TOKEN}
    volumes:
      - ./data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.zostaje.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.zostaje.tls.certresolver=letsencrypt"
```

### Backup

- **Vault:** eksportuj plik `.zostaje` z zakladki Ustawienia
- **SQLite (legacy):** skopiuj `prisma/dev.db` (lub `/data/finance.db` w Dockerze)
- **Automatyczne backupy:** konfigurowalne w Ustawienia

> Faktury VAT maja obowiazek przechowywania przez **5 lat** — pamietaj o backupach.

---

## Co planujemy

| Priorytet | Funkcja | Status |
|-----------|---------|--------|
| 1 | Dashboard "jedna liczba" z drill-down | W toku |
| 2 | Command Palette — pelne pokrycie akcji | W toku |
| 3 | Import CSV — auto-detekcja banku | Gotowe |
| 4 | KSeF integracja produkcyjna | Planowane |
| 5 | Electron auto-update | Planowane |
| 6 | Multi-waluta z live kursami NBP | Planowane |
| 7 | Eksport JPK-V7M | Gotowe |
| 8 | Pluginy spolecznosci — marketplace | Planowane |
| 9 | Mobile PWA (offline) | Czesciowo |
| 10 | AI kategoryzacja (Ollama) | Gotowe |

---

## Tech stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 14 (App Router), React 18, TypeScript 5 |
| UI | HeroUI v2, Tailwind CSS, Radix UI, Framer Motion |
| State | Zustand, TanStack Query v5 |
| Dane lokalne | IndexedDB (idb) + AES-GCM vault |
| Dane serwerowe | Prisma 5 + SQLite (legacy, migracja w toku) |
| Desktop | Electron 33 (electron-builder) |
| Wykresy | Recharts, D3 (graf powiazan) |
| AI | Ollama (lokalne LLM — llama3, mistral, llava) |
| Email | Nodemailer |
| Command palette | cmdk |
| Crypto | Web Crypto API (zero zewnetrznych zaleznosci) |

---

## Licencja

Copyright 2026 [Boring Code — Rajan Bor](https://github.com/1norahc)

Dostepne na licencji [Functional Source License, Version 1.1](LICENSE.md).
Po 2 latach od wydania wersji — [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

| Dozwolone | Zabronione |
|-----------|------------|
| Self-hosting na wlasnym serwerze | Oferowanie jako SaaS/Cloud |
| Modyfikacje i forki | Rebrandowanie i odsprzedaz |
| Pull requesty i kontrybucje | |
| Uzytek komercyjny (wlasna firma) | |

---

<div align="center">

**zostaje.** Zbudowane z mysla o polskich JDG, ktore maja lepsze rzeczy do roboty niz walka z Excelem.

*Ile realnie zostaje? Teraz wiesz.*

</div>
