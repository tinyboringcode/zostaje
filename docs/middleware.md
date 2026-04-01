# Middleware i autentykacja

**Plik:** `src/middleware.ts`  
**Środowisko:** Next.js Edge Runtime

---

## Kolejność sprawdzeń

```
Żądanie przychodzi
    │
    ▼
1. Czy to publiczna ścieżka?
   (/login, /onboarding, /api/health, /api/auth/login, /m/*)
   → TAK: przepuść
   → NIE: kontynuuj
    │
    ▼
2. Czy APP_PASSWORD jest ustawione?
   → TAK: sprawdź cookie auth
     → Brak cookie: redirect /login
   → NIE: pomiń (brak ochrony hasłem)
    │
    ▼
3. Czy to ścieżka główna "/" + mobile user agent?
   → TAK: redirect /m/
   → NIE: kontynuuj
    │
    ▼
4. Czy cookie onboarding_done=1 istnieje?
   → NIE + ścieżka nie jest /onboarding: redirect /onboarding
   → TAK: przepuść
    │
    ▼
Odpowiedź
```

---

## Ochrona hasłem

Opcjonalna, sterowana zmienną `APP_PASSWORD`.

Jeśli `APP_PASSWORD=""` (puste) → ochrona wyłączona.

**Login flow:**
1. `POST /api/auth/login` z `{ password }`
2. Jeśli hasło = `APP_PASSWORD` → set cookie `auth={token}` (HttpOnly, 30 dni)
3. Redirect do strony głównej

**Weryfikacja:**
- Middleware sprawdza cookie `auth` przy każdym żądaniu
- Cookie = hash SHA256(`APP_PASSWORD + salt`)

---

## Onboarding

Pierwsze uruchomienie kieruje na `/onboarding` (`src/app/onboarding/page.tsx`).

`IntroScreen` (`src/components/onboarding/IntroScreen.tsx`) — kroki:
1. Powitanie + opis aplikacji
2. Dane firmy (nazwa, NIP)
3. Forma podatkowa + etap ZUS
4. Zakończenie → `PUT /api/settings` + set cookie `onboarding_done=1`

Po ustawieniu cookie → przekierowanie na `/`.

---

## Mobile redirect

User agent rozpoznany jako mobile (iOS/Android) → redirect z `/` na `/m/`.

Wykrywanie UA: sprawdzenie `User-Agent` nagłówka na słowa kluczowe: `Mobile`, `Android`, `iPhone`, `iPad`.

Użytkownik może ręcznie wrócić do wersji desktop przez link w mobile UI.

---

## Publiczne ścieżki (bez auth)

```
/login
/onboarding
/api/health
/api/auth/login
/m/*
/(marketing)/*
```

Wszystkie pozostałe ścieżki wymagają:
1. Cookie auth (jeśli APP_PASSWORD ustawione)
2. Cookie onboarding_done
