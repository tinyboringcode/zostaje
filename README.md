<div align="center">

```
 ______     ______     ______     ______   ______     __     ______    
/\___  \   /\  __ \   /\  ___\   /\__  _\ /\  __ \   /\ \   /\  ___\   
\/_/  /__  \ \ \/\ \  \ \___  \  \/_/\ \/ \ \  __ \  \ \ \  \ \  __\   
  /\_____\  \ \_____\  \/\_____\    \ \_\  \ \_\ \_\  \ \_\  \ \_____\ 
  \/_____/   \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/   \/_____/ 
```

# zostaje.

**Finanse dla polskich JDG. Prosto, lokalnie, Twoje.**

*Transakcje · Faktury · KSeF · Budżety · Podatki · AI*

---

[![License: FSL-1.1](https://img.shields.io/badge/License-FSL--1.1-blue.svg)](https://fsl.software/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![Self-hostable](https://img.shields.io/badge/Self--host-Docker-2496ED?logo=docker)](https://www.docker.com/)

</div>

---

## Czym jest zostaje.?

**zostaje.** to aplikacja finansowa zaprojektowana specjalnie dla polskich jednoosobowych działalności gospodarczych. Nie jest to kolejny arkusz Excel ani drogie oprogramowanie księgowe — to narzędzie, które działa **lokalnie na Twoim serwerze**, nie wysyła Twoich danych do chmury i robi dokładnie to, czego potrzebujesz jako JDG.

**Dla kogo?** Freelancerzy, programiści, projektanci, konsultanci — każdy kto ma JDG i chce mieć finanse pod kontrolą bez płacenia abonamentu za oprogramowanie.

---

## Funkcje

### Transakcje i finanse
- Śledzenie przychodów i wydatków z kategoryzacją
- **Auto-kategoryzacja** przez lokalne AI (Ollama) — bez wysyłania danych na zewnątrz
- Import wyciągów bankowych z CSV
- Wykrywanie duplikatów transakcji (fingerprinting)
- Budżety miesięczne per kategoria z alertami przekroczenia

### Faktury i kontrahenci
- Wystawianie faktur VAT z automatyczną numeracją
- Baza kontrahentów z NIP i danymi adresowymi
- Generowanie PDF faktur
- **Integracja z KSeF** (Krajowy System e-Faktur) — wysyłka faktur do Ministerstwa Finansów
- Śledzenie statusów: Wystawiona → Wysłana → Opłacona

### Podatki i zgodność
- Kalkulator zaliczek PIT (skala, liniowy, ryczałt)
- Śledzenie progu rejestracji VAT (200k PLN)
- Przypomnienia o terminach (ZUS do 20., JPK do 25.)
- Kalkulacje składek ZUS

### Raporty i dashboard
- Dashboard z KPI: przychody, wydatki, zysk, prognoza podatku
- Wykresy trendów miesięcznych (Recharts)
- Struktura wydatków per kategoria
- Powiadomienia email (SMTP) — raporty, przeterminowane faktury

### Integracje
| Integracja | Opis | Konfiguracja |
|------------|------|-------------|
| **KSeF** | Krajowy System e-Faktur (MF) | UI → Ustawienia |
| **Ollama** | Lokalny model AI (llama3, mistral) | UI → Ustawienia |
| **SMTP** | Email (Gmail, własny serwer) | UI → Ustawienia |

---

## Szybki start

### Wymagania
- **Node.js** 18+
- **npm** 9+
- *(opcjonalnie)* Docker dla self-hostingu
- *(opcjonalnie)* [Ollama](https://ollama.ai/) dla auto-kategoryzacji AI

### Uruchomienie lokalne

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/1norahc/zostaje.git
cd zostaje

# 2. Zainstaluj zależności
npm install

# 3. Skonfiguruj środowisko
cp .env.example .env

# 4. Zainicjalizuj bazę danych
npx prisma migrate deploy

# 5. Wgraj domyślne kategorie
npm run db:seed

# 6. Uruchom
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000)

### Zmienne środowiskowe

| Zmienna | Opis | Domyślna |
|---------|------|---------|
| `DATABASE_URL` | Ścieżka do pliku SQLite | `file:./dev.db` |
| `APP_PASSWORD` | Hasło dostępu (puste = brak) | *(brak)* |
| `NEXTAUTH_SECRET` | Sekret sesji — zmień na produkcji! | `change-me` |
| `DOMAIN` | Domena (Docker/Traefik) | `localhost` |

> Pozostałe konfiguracje (SMTP, Ollama, KSeF) ustawiasz przez UI w zakładce **Ustawienia** — bez dotykania plików.

---

## Self-hosting z Docker

Najprostszy sposób na uruchomienie na własnym serwerze:

```bash
# Pobierz plik konfiguracyjny
curl -O https://raw.githubusercontent.com/1norahc/zostaje/main/docker-compose.yml

# Skonfiguruj zmienne
cp .env.example .env
# Edytuj .env — ustaw NEXTAUTH_SECRET i DOMAIN

# Uruchom
docker compose up -d
```

### Z Traefikiem (HTTPS)

```yaml
# docker-compose.yml — fragment
services:
  app:
    image: ghcr.io/1norahc/zostaje:latest
    environment:
      - DATABASE_URL=file:/data/finance.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - ./data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.zostaje.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.zostaje.tls.certresolver=letsencrypt"
```

---

## Stack technologiczny

```
Next.js 14 (App Router)     — framework, SSR, API routes
Prisma 5 + SQLite           — ORM + baza danych (jeden plik, zero konfiguracji)
HeroUI v2                   — biblioteka komponentów UI
TanStack Query              — cache i synchronizacja danych z API
Zustand                     — globalny stan aplikacji
Recharts                    — wykresy finansowe
Tailwind CSS                — stylowanie
Sonner                      — powiadomienia toast
Ollama                      — lokalne modele AI (opcjonalne)
```

### Architektura

```
src/
├── app/
│   ├── (app)/              # Strony z sidebar/header layoutem
│   └── api/                # REST API endpoints
├── components/             # Komponenty UI
│   ├── layout/             # Sidebar, Header
│   ├── dashboard/          # Dashboard widgets
│   └── [feature]/          # Komponenty per funkcja
├── server/                 # Kod serwerowy (Prisma, mailer, KSeF, AI)
└── lib/                    # Współdzielony kod (formatters, utils, tax-calculator)
```

### Komendy developerskie

```bash
npm run dev           # Serwer dev na :3000
npm run build         # Build produkcyjny (prisma generate + next build)
npm run lint          # ESLint
npm run db:migrate    # Nowa migracja Prisma
npm run db:push       # Sync schematu bez migracji (dev-only)
npm run db:seed       # Domyślne kategorie
npm run db:studio     # Prisma Studio na :5555
```

---

## Backup danych

Cała baza danych to **jeden plik SQLite**. Backup jest trywialny:

```bash
cp prisma/dev.db "backup-$(date +%Y%m%d).db"
```

Faktury VAT mają obowiązek przechowywania przez **5 lat** — wbuduj backup w cron lub skorzystaj z automatycznych backupów w wersji Cloud.

---

## Model licencjonowania

**zostaje.** działa na licencji [Functional Source License 1.1 (FSL)](https://fsl.software/).

### Co możesz robić

| | Dozwolone |
|--|-----------|
| Self-hosting | Tak — na własnym serwerze, dla siebie lub firmy |
| Modyfikacje | Tak — fork, dostosowanie do własnych potrzeb |
| Kontrybucje | Tak — pull requesty są mile widziane |
| Użytek komercyjny (własny) | Tak — używaj do zarządzania własną firmą |

### Czego nie możesz robić

| | Zabronione |
|--|-----------|
| Oferowanie jako SaaS/Cloud | Nie — nie możesz sprzedawać dostępu do cudzego kodu |
| Rebrandowanie i odsprzedaż | Nie — szanujmy swoją pracę |

### Change Date — automatyczne otwieranie

Po **2 latach** od wydania danej wersji licencja FSL automatycznie wygasa i wersja przechodzi na **Apache License 2.0** (w pełni otwarta licencja). Kod zawsze w końcu staje się w pełni wolny.

> **Dlaczego FSL?** Chcę, żeby finansowa logika aplikacji była **transparentna** (każdy może sprawdzić jak liczymy podatki i ZUS), ale jednocześnie żeby projekt mógł się finansowo utrzymać przez wersję Cloud. Self-hosting jest i pozostanie darmowy.

---

## Wkład w projekt

Pull requesty są bardzo mile widziane, szczególnie w obszarach:

- Poprawki obliczeń podatkowych / ZUS
- Nowe stawki i przepisy (aktualizacje rokrocznie)
- Importery wyciągów bankowych (MT940, OFX, formaty banków)
- Tłumaczenia i lokalizacja
- Testy (brak ich w projekcie — każdy PR z testami to złoto)

```bash
git checkout -b feature/nazwa-funkcji
# ... zmiany ...
git commit -m "feat: opis zmiany"
git push origin feature/nazwa-funkcji
# → otwórz Pull Request
```

---

## Roadmapa / TODO

Otwarte zadania śledzone jako [GitHub Issues](https://github.com/tinyboringcode/zostaje/issues). Poniżej skrót tego co jest zaplanowane.

### Bugs & UI
- [ ] [#1](https://github.com/tinyboringcode/zostaje/issues/1) Wyrównanie i wyśrodkowanie elementów UI w całej aplikacji
- [ ] [#3](https://github.com/tinyboringcode/zostaje/issues/3) Przeprojektowanie sekcji Kontrahenci — widok kart, zakładki, oś czasu aktywności

### Funkcje finansowe
- [ ] [#2](https://github.com/tinyboringcode/zostaje/issues/2) Mocny kalkulator ZUS — ulga na start, Mały ZUS, Mały ZUS Plus, pełny ZUS, składka zdrowotna per forma opodatkowania
- [ ] Import wyciągów bankowych — MT940, OFX, formaty ING/PKO/mBank
- [ ] Eksport JPK_V7M — pełny format XML do wysyłki do US
- [ ] Tryb wielofirmowy — obsługa więcej niż jednej JDG

### AI & Automatyzacja
- [ ] [#5](https://github.com/tinyboringcode/zostaje/issues/5) Predykcja budżetu — prognoza wydatków na kolejny miesiąc na podstawie historii
- [ ] Batch OCR — przetwarzanie folderu ze zdjęciami paragonów
- [ ] Chat z danymi finansowymi — "Ile wydałem na marketing w Q1?"
- [ ] Wykrywanie anomalii — alert gdy wydatek w kategorii odstaje od normy
- [ ] Whisper — głosowe dodawanie transakcji

### Techniczne
- [ ] [#4](https://github.com/tinyboringcode/zostaje/issues/4) Code review — bezpieczeństwo, walidacja inputów, luki w API
- [ ] Testy — brak pokrycia testami; E2E (Playwright) i unit (Vitest) to priorytet
- [ ] Automatyczne backupy — cron + opcja wysyłki na S3/Backblaze
- [ ] Rate limiting na API — zabezpieczenie przed nadmiernym użyciem

---

## Licencja

Copyright © 2026 [Boring Code — Rajan Bor](https://github.com/1norahc)

Dostępne na licencji [Functional Source License, Version 1.1](LICENSE.md).  
Po 2 latach od wydania wersji — [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

---

<div align="center">

Zbudowane z myślą o polskich JDG, które mają lepsze rzeczy do roboty niż walka z Excelem.

**zostaje.**

</div>
