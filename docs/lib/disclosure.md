# Lib — System odkrywania funkcji (Disclosure)

**Plik:** `src/lib/disclosure.ts`  
**Context:** `src/contexts/DisclosureContext.tsx`  
**API:** `GET /api/system/progress`

---

## Koncepcja

Funkcje aplikacji są stopniowo odblokowywane w miarę korzystania z aplikacji. Cel: nie przytłaczać nowego użytkownika wszystkimi funkcjami naraz — pokazuj je dopiero gdy mają sens (są dane do analizy).

Odblokowanie zależy od:
- Liczby transakcji (`txCount`)
- Liczby dni od najstarszej transakcji (`oldestDays`)

---

## Bramy (Gates)

| Feature | Minimalna liczba TX | Minimalna liczba dni | Opis |
|---------|---------------------|----------------------|------|
| `dashboard_basic` | 0 | 0 | Dostępne od razu |
| `categories` | 1 | 0 | Po pierwszej transakcji |
| `budgets` | 5 | 0 | Po 5 transakcjach |
| `taxes` | 5 | 0 | Po 5 transakcjach |
| `reports_basic` | 10 | 7 | Po tygodniu z danymi |
| `ai_suggestions` | 20 | 0 | Po 20 transakcjach |
| `wskazniki` | 20 | 14 | Po 2 tygodniach z danymi |
| `patterns` | 30 | 30 | Po miesiącu |
| `cykl` | 30 | 30 | Po miesiącu |
| `fingerprint` | 60 | 60 | Po 2 miesiącach z danymi |
| `reports_advanced` | 50 | 90 | Po 3 miesiącach |

---

## `computeDisclosure(txCount, oldestDays)`

Oblicza stan odblokowania.

**Parametry:**
- `txCount: number` — liczba transakcji w bazie
- `oldestDays: number` — dni od najstarszej transakcji

**Zwraca:**
```ts
{
  unlocked: string[],        // Lista odblokowanych features
  nextUnlock: {
    feature: string,
    requiresTx: number,
    requiresDays: number,
    missingTx: number,       // Ile TX brakuje
    missingDays: number      // Ile dni brakuje
  } | null,
  progressPct: number        // % postępu do następnego odblokownia
}
```

---

## DisclosureContext

**Plik:** `src/contexts/DisclosureContext.tsx`

React Context udostępniający stan odblokowania wszystkim komponentom.

```tsx
const { isUnlocked, nextUnlock, progressPct } = useDisclosure()

// Sprawdzenie bramy
if (!isUnlocked("wskazniki")) {
  return <LockedFeature feature="wskazniki" />
}
```

**Dane:** Pobiera `GET /api/system/progress` przy inicjalizacji aplikacji i co 5 minut.

---

## Integracja z Sidebar

`Sidebar.tsx` używa `isUnlocked()` dla każdego linku:
- Odblokowane → normalny link
- Zablokowane → link z kłódką + tooltip "Potrzebujesz X transakcji"

---

## Integracja z ProgressCard

`ProgressCard` na dashboardzie wizualizuje:
- Ile transakcji / dni do kolejnego odblokownia
- Pasek postępu
- Nazwa następnej funkcji
