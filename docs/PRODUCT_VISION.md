# zostaje. — Wizja produktu

## Jedno pytanie

> **Ile realnie zostaje mi z tego co zarobilem?**

To jedyne pytanie na ktore zostaje. odpowiada. Nie jest dashboardem finansowym.
Nie jest kolejnym SaaS-em. To lokalny, zaszyfrowany skarbiec finansow — jak Obsidian, ale dla pieniedzy.

---

## Problem

Polski przedsiebiorca JDG:

1. **Nie wie ile mu zostaje.** Widzi przychod na koncie, ale nie wie ile z tego zjedzq ZUS, PIT, VAT, skladka zdrowotna. Dopiero po rozliczeniu dowiaduje sie, ze "zarobilem 15 000" to tak naprawde "zostalo 8 200".

2. **Uzywa Excela albo niczego.** Istniejace narzedzia sa albo za drogie, albo za skomplikowane, albo wymuszajq oddanie danych na cudzy serwer. Wiekszos JDG w ogole nie sled swojego cash flow.

3. **Boi sie o swoje dane.** Dane finansowe to jedne z najbardziej wraliwyh. JDG nie chce ich wysylac w chmure do firmy o ktorej nic nie wie.

---

## Rozwiazanie

### Jedna liczba na wierzchu

Glowny widok to nie "dashboard z 12 widgetami". To jedna duza liczba:

```
  zostaje: 8 247 zl
  ─────────────────
  przychod    15 000
  - wydatki    3 200
  - ZUS        1 853
  - PIT        1 700
```

Wszystko inne jest drill-down. Klikasz w ZUS — widzisz rozbicie na skladki.
Klikasz w wydatki — widzisz kategorie. Nie musisz — liczba na gorze wystarcza.

### Command Palette first

`Cmd+K` to serce aplikacji. Kazda akcja jest dostepna z klawiatury:

- "Dodaj przychod 5000 od Allegro" — jedno polecenie
- "Ile ZUS w marcu?" — odpowiedz natychmiast
- "Pokaz transakcje > 1000 zl" — filtr bez klikania

Jesli akcja nie jest w Command Palette — nie jest gotowa do releasu.

### Free jest kompletny

Zadna funkcja finansowa nie idze za paywall. Nigdy.

- Podatki, ZUS, faktury, import CSV, raporty, graf, reguly, pluginy — **Free**
- Jedyna rzecz w Pro: sync przez serwer Boring Code (wygoda, multi-device)
- Desktop Electron: pelne funkcje, zero konta, zero internetu

Model Obsidian: Free jest kompletny. Pro to convenience.

### Dane naleza do uzytkownika

- Plik `.zostaje` jest jego, nie nasz
- AES-GCM-256 + PBKDF2 (310k iteracji) — standard bankowy
- Serwer nigdy nie widzi plaintextu (E2E encryption)
- Bez hasla danych nie da sie odszyfrowac — to celowe, nie bug
- Uzytkownik moze wrzucic plik na Google Drive / iCloud / USB — sam decyduje

### Niewidzialne narzedzie

Aplikacja ma nie ciazyc. Zero friction:

- Otwierasz → widzisz ile zostaje → zamykasz
- Dodajesz transakcje → reguly kategoryzuja automatycznie
- Zbliza sie termin ZUS → dostajesz przypomnienie
- Koniec miesiaca → digest ze statystykami

Uzytkownik nie powinien "spedzac czasu" w aplikacji. Ma miec odpowiedz i wrocic do pracy.

### Ukryte super-funkcje

Zaawansowane funkcje istnieja, ale sie nie narzucaja:

| Funkcja | Gdzie ja znalezc |
|---------|-----------------|
| Graf powiazan | Command Palette → "Graf" |
| Silnik regul | Command Palette → "Reguly" |
| System pluginow | Ustawienia → Pluginy |
| Audit log | Ustawienia → Historia zmian |
| Projekty | Command Palette → "Projekty" |
| Symulacja podatkowa | Command Palette → "Porownaj formy" |

Odkrywasz je kiedy potrzebujesz. Nie obciazaja Cie jesli nie potrzebujesz.

---

## Model biznesowy

```
                    zostaje.
                 ┌─────────────┐
    Free         │  Desktop    │  100% funkcji
    (Electron)   │  Offline    │  Dane na dysku
                 │  Vault file │  Sync = Twoj cloud
                 └─────────────┘
                        │
                        │ chce wygode?
                        v
                 ┌─────────────┐
    Pro          │  Sync       │  29 zl/mc
    (29 zl/mc)   │  Multi-dev  │  Automatyczny backup
                 │  Priority   │  Zero konfiguracji
                 └─────────────┘
```

### Dlaczego to dziala

1. **Free jest naprawde free** — uzytkownik nie czuje sie oszukany
2. **Pro rozwiazuje prawdziwy problem** — sync miedzy urzadzeniami to bol
3. **Niska cena** — 29 zl/mc to mniej niz kawa w tygodniu
4. **Brak vendor lock-in** — zawsze mozesz wyeksportowac i wrocic do Free

### Czego NIGDY nie robimy

- Feature paywall (blokowanie funkcji za Pro)
- Ukrywanie funkcji (ProGate pokazuje upgrade card, nigdy nie chowa)
- Wymuszanie konta dla Desktop
- Trackowanie uzytkownikow
- Reklamy
- Sprzedaz danych (nie mamy do nich dostepu — E2E)

---

## Architektura docelowa

```
┌─────────────────────────────────────────────────┐
│                  UI (React)                      │
│  Dashboard (jedna liczba) │ Command Palette      │
│  Transakcje │ Faktury │ Raporty │ Graf │ ...     │
└──────────────────┬──────────────────────────────┘
                   │
            ┌──────┴──────┐
            │  storage.ts  │  ← jedyny punkt dostepu
            │  (CRUD API)  │
            └──────┬──────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   ┌────┴────┐ ┌──┴───┐ ┌───┴────┐
   │ crypto  │ │  db  │ │ audit  │
   │ AES-GCM │ │ IDB  │ │ log   │
   └─────────┘ └──────┘ └────────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
    ┌────┴───┐ ┌──┴───┐ ┌──┴──────┐
    │ rules  │ │ plug │ │ sync    │
    │ engine │ │ -ins │ │ (E2E)   │
    └────────┘ └──────┘ └─────────┘
```

### Warstwy

1. **UI** — React + HeroUI v2. Jedna liczba na wierzchu, Command Palette, drill-down.
2. **storage.ts** — jedyny punkt dostepu do danych. Szyfruje, loguje, dispatchuje hooki.
3. **crypto + db + audit** — fundamenty. Stabilne, nie modyfikujemy bez powodu.
4. **rules + plugins + sync** — rozszerzalnosc. Reguly, pluginy spolecznosci, sync E2E.

### Zasady architektoniczne

- **Nowy kod dostepu do danych MUSI isc przez `storage.ts`**
- **Pluginy NIGDY nie lamia hosta** — try/catch na kazdym hooku
- **Sync jest E2E** — serwer = storage, nie procesor danych
- **Silnik regul musi byc czysty** — zero mutacji, zero side effects
- **Zero zewnetrznych zaleznosci kryptograficznych** — tylko Web Crypto API

---

## Grupa docelowa

### Primary: JDG do 500k przychodu rocznie

- Freelancerzy IT, graficy, copywriterzy, konsultanci
- Jedna osoba = jeden urzadzenie (lub dwa — laptop + telefon)
- Nie chca i nie potrzebuja pelnej ksiegowosci
- Chca wiedziec: ile zostaje, ile ZUS-u, kiedy termin

### Secondary: JDG 500k-2M

- Maja ksiegowa, ale chca kontrolowac cash flow na biezaco
- Wiecej kontrahentow, projekty, faktury
- Odkrywaja zaawansowane funkcje (graf, reguly, pluginy)

### Nie obslugujemy (swiadomie)

- Spolki (sp. z o.o., S.A.) — inna struktura podatkowa
- JDG z pracownikami — wymaga listy plac
- Import/export miedzynarodowy — wymaga specjalistycznej wiedzy celnej

---

## Metryki sukcesu

| Metryka | Cel | Dlaczego |
|---------|-----|----------|
| Time to first "zostaje" | < 2 minuty | Setup hasla → dodaj transakcje → widzisz liczbe |
| Sesja uzytkownika | < 90 sekund | Niewidzialne narzedzie — wejsc, zobaczyc, wyjsc |
| Retencja 30-dniowa | > 60% | Uzytkownik wraca co miesiac (termin ZUS) |
| Konwersja Free → Pro | 5-8% | Zdrowy model Obsidian |
| NPS | > 50 | Uzytkownik poleca, bo dziala i nie przeszkadza |

---

## Roadmap

### Teraz (Q2 2026)

- [ ] Dashboard "jedna liczba" z drill-down
- [ ] Command Palette — pelne pokrycie wszystkich akcji
- [ ] Electron auto-update
- [ ] Demo mode z mock data

### Nastepne (Q3 2026)

- [ ] KSeF integracja produkcyjna
- [ ] Multi-waluta z live kursami NBP
- [ ] Mobile PWA (pelny offline)
- [ ] Pluginy spolecznosci — marketplace z systemem uprawnien

### Pozniej (Q4 2026+)

- [ ] API dla integracji (zapier, make, ifttt)
- [ ] Porownanie form opodatkowania year-over-year
- [ ] AI asystent podatkowy (lokalne LLM)
- [ ] Wspoluzytkowanie (ksiegowa ma read-only dostep do vaulta klienta)

---

## Podsumowanie

zostaje. to odpowiedz na pytanie ktore zadaje sobie kazdy JDG.
Nie kolejny dashboard. Nie kolejny SaaS.
Lokalne narzedzie ktore liczy, szyfruje i nie przeszkadza.

**Jedna liczba. Twoje dane. Zero kompromisow.**
