# CashFlow JDG — Dokumentacja projektu

Aplikacja finansowa dla polskich JDG (Jednoosobowa Działalność Gospodarcza). Zarządzanie transakcjami, budżetami, kontrahentami, fakturami, powiadomieniami e-mail i integracjami (KSeF, Ollama AI).

---

## Spis treści

| Dokument | Opis |
|----------|------|
| [Architektura](./architecture.md) | Ogólna architektura, przepływ danych, połączenia między modułami |
| [Baza danych](./database.md) | Schemat Prisma, modele, relacje |
| [API](./api.md) | Wszystkie endpointy REST |
| [Komponenty — Dashboard](./components/dashboard.md) | Widgety dashboardu, wykresy, KPI |
| [Komponenty — Transakcje](./components/transactions.md) | Lista transakcji, formularze, import CSV |
| [Komponenty — Budżety](./components/budgets.md) | Zarządzanie limitami miesięcznymi |
| [Komponenty — Kategorie](./components/categories.md) | Kategorie przychodów i kosztów |
| [Komponenty — Kontrahenci](./components/contractors.md) | Dostawcy, klienci, faktury |
| [Komponenty — Raporty](./components/reports.md) | Raporty miesięczne, eksport |
| [Komponenty — Podatki](./components/taxes.md) | Kalkulator podatkowy, ZUS, harmonogram |
| [Komponenty — Wskaźniki](./components/indicators.md) | Analiza biznesowa, runway, forecast |
| [Komponenty — Wzorce](./components/patterns.md) | Analiza wzorców wydatków, anomalie |
| [Komponenty — Layout](./components/layout.md) | AppShell, Sidebar, Header, nawigacja |
| [Komponenty — Mobile](./components/mobile.md) | Wersja mobilna |
| [Lib — Kalkulator podatkowy](./lib/tax-calculator.md) | Obliczenia ZUS, PIT, składka zdrowotna |
| [Lib — Narzędzia](./lib/utilities.md) | formatters, csv-parser, parse-transaction, utils |
| [Lib — Disclosure](./lib/disclosure.md) | System odblokowywania funkcji |
| [Server — Mailer](./server/mailer.md) | Powiadomienia e-mail, szablony HTML |
| [Server — Categorizer](./server/categorizer.md) | ML kategoryzacja transakcji |
| [Server — Fingerprint](./server/fingerprint.md) | Wykrywanie anomalii (z-score) |
| [Server — KSeF](./server/ksef.md) | Integracja z KSeF (e-faktury) |
| [Funkcja — Import danych](./features/import.md) | CSV, KSeF, folder monitorowany |
| [Funkcja — AI](./features/ai.md) | Ollama, kategoryzacja, OCR paragonu |
| [Middleware i auth](./middleware.md) | Ochrona tras, onboarding, przekierowanie mobile |
| [Zmienne środowiskowe](./env.md) | Konfiguracja .env |

---

## Stack technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Framework | Next.js 14 (App Router) |
| Baza danych | SQLite via Prisma 5 |
| UI | HeroUI v2, Tailwind CSS |
| Stan serwera | TanStack Query v5 |
| Stan klienta | Zustand 5 |
| Wykresy | Recharts 3 |
| E-mail | Nodemailer |
| Animacje | Framer Motion |
| Toasty | Sonner |
| Motywy | next-themes |

---

## Szybki start

```bash
npm install
npm run db:migrate      # Utwórz schemat bazy
npm run db:seed         # Domyślne kategorie
npm run dev             # Dev server na :3000
```

---

## Komendy

```bash
npm run dev             # Dev server
npm run build           # prisma generate + next build
npm run lint            # ESLint
npm run db:migrate      # npx prisma migrate dev
npm run db:push         # Sync bez migracji (dev-only)
npm run db:seed         # Domyślne kategorie
npm run db:studio       # Prisma Studio na :5555
```
