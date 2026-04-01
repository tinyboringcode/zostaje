# Komponenty — Layout

Ścieżka: `src/components/layout/`  
Layout: `src/app/(app)/layout.tsx`

---

## AppShell

**Plik:** `src/components/layout/AppShell.tsx`

Główny wrapper layoutu aplikacji. Zawiera sidebar, header i obszar treści.

```
AppShell
├─ Sidebar          (lewa kolumna, stała szerokość)
└─ main
   ├─ Header        (górny pasek)
   └─ {children}    (treść strony)
```

**Props:**
- `children: ReactNode` — treść strony

**Responsywność:**
- Desktop: sidebar zawsze widoczny
- Mobile: sidebar jako drawer (overlay), otwierany przyciskiem hamburger w Header

---

## Sidebar

**Plik:** `src/components/layout/Sidebar.tsx`

Nawigacja boczna z linkami do wszystkich sekcji.

### Struktura menu

```
Logo / Nazwa firmy
────────────────
📊 Dashboard
💸 Transakcje
🏷 Kategorie
📅 Budżety
👥 Kontrahenci
────────────────
📈 Raporty           [gate: reports_basic]
🧮 Podatki
📊 Wskaźniki         [gate: wskazniki]
🔄 Wzorce            [gate: patterns]
🔄 Cykl              [gate: cykl]
────────────────
🤖 Demo AI           
📥 Import
📚 Wiedza
────────────────
⚙️ Ustawienia
```

**Zablokowane funkcje:**
- `isUnlocked(feature)` z `DisclosureContext`
- Zablokowane linki: kłódka + `opacity-50`
- Tooltip z informacją ile transakcji brakuje

**Aktywny link:** `usePathname()` z Next.js — podświetlenie aktywnej sekcji.

---

## Header

**Plik:** `src/components/layout/Header.tsx`

Górny pasek nawigacyjny.

**Zawartość:**
- Przycisk hamburger (mobile — otwiera Sidebar)
- Tytuł bieżącej strony
- `ThemeToggle` — przełącznik ciemny/jasny motyw
- Avatar/ikona użytkownika (uproszczona, single-user)

---

## TopNav

**Plik:** `src/components/layout/TopNav.tsx`

Sekcyjna nawigacja pozioma (używana na stronach z zakładkami, np. Ustawienia).

**Props:** `tabs: { label, href | value }[]`

---

## ThemePicker

**Plik:** `src/components/layout/ThemePicker.tsx`

Rozbudowany selektor motywu z presetami palet kolorów.

**Opcje:**
- Jasny / Ciemny / Systemowy
- Presetowe palety (fiolet, niebieski, zielony, etc.)

Korzysta z `next-themes` i `PaletteContext`.

---

## ThemeToggle

**Plik:** `src/components/layout/ThemeToggle.tsx`

Prosty przycisk moon/sun do przełączania jasny ↔ ciemny.

---

## Providers

**Plik:** `src/components/providers.tsx`

Wrapper wszystkich providerów React:

```tsx
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <DisclosureProvider>
      <TourProvider>
        <PaletteProvider>
          {children}
          <Toaster />  {/* Sonner */}
          <ReactQueryDevtools />
        </PaletteProvider>
      </TourProvider>
    </DisclosureProvider>
  </ThemeProvider>
</QueryClientProvider>
```

Importowany w `src/app/layout.tsx`.

---

## Klasy CSS (globals.css)

Dostępne globalne klasy pomocnicze:

| Klasa | Opis |
|-------|------|
| `.glass` | Glassmorphism (backdrop-blur + bg opacity) |
| `.glow-hover` | Efekt świecenia przy hover |
| `.gradient-text` | Tekst z gradientem |
| `.animate-fade-in` | Fade in animation |
| `.animate-slide-up` | Slide up animation |
