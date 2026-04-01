# Server — Integracja KSeF

**Plik:** `src/server/ksef.ts`  
**API:** Krajowy System e-Faktur (MF)  
**Endpoint:** `POST /api/ksef/sync`

---

## Koncepcja

KSeF (Krajowy System e-Faktur) to polskie ministerstwo finansów API do e-faktur. Integracja umożliwia automatyczne pobieranie faktur zakupowych.

---

## Konfiguracja

W `Settings` (id=1):
| Pole | Opis |
|------|------|
| `ksefToken` | Token API z portalu KSeF |
| `ksefEnvironment` | `test` lub `prod` |
| `ksefEnabled` | Czy integracja aktywna |

**URL środowisk:**
- Test: `https://ksef-test.mf.gov.pl/api`
- Prod: `https://ksef.mf.gov.pl/api`

---

## Flow autentykacji

KSeF używa 3-etapowej autentykacji z kryptografią:

### Krok 1: `getChallenge()`

`POST /online/Session/AuthorisationChallenge`

Zwraca:
```json
{
  "timestamp": "2026-04-01T10:00:00Z",
  "challenge": "random-nonce-string"
}
```

### Krok 2: `encryptChallenge(token, challenge, timestamp)`

Szyfruje token AES-256-CBC:
```
IV = pierwsze 16 bajtów timestamp (bez myślników/dwukropków)
key = token (UTF-8, padded/trimmed do 32 bajtów)
encrypted = AES.encrypt(challenge, key, IV)
```

### Krok 3: `initSession(nip, encryptedToken)`

`POST /online/Session/Initialise`

Wysyła NIP firmy + zaszyfrowany token.

Zwraca `sessionToken` do kolejnych żądań.

### `authenticate(settings)`

Łączy kroki 1-3. Zwraca `sessionToken`.

---

## `fetchInvoices(sessionToken, dateFrom, dateTo)`

Pobiera faktury zakupowe (perspektywa kupującego).

`GET /online/Invoice/GetForBuyer?dateFrom=...&dateTo=...`

Nagłówek: `SessionToken: {sessionToken}`

**Zwraca:**
```ts
[{
  ksefNumber: string,     // Unikalny numer w KSeF
  number: string,         // Numer faktury sprzedawcy
  issuerName: string,     // Nazwa wystawcy
  issuerNip: string,      // NIP wystawcy
  amount: number,         // Kwota brutto
  issueDate: string,      // Data wystawienia
  dueDate: string         // Termin płatności
}]
```

---

## `terminateSession(sessionToken)`

`GET /online/Session/Terminate`

Kończy sesję (cleanup).

---

## Logika importu (`POST /api/ksef/sync`)

```
1. Pobierz Settings → ksefEnabled, ksefToken, ksefEnvironment
2. Jeśli !ksefEnabled → błąd 400
3. authenticate() → sessionToken
4. fetchInvoices() → lista faktur
5. Dla każdej faktury:
   a. Sprawdź czy ksefNumber w KSeFImport → jeśli tak, skip
   b. Znajdź lub utwórz Contractor po NIP
   c. Utwórz ContractorInvoice
   d. Dodaj wpis do KSeFImport (dedupl.)
6. terminateSession()
7. Zwróć: { imported: N, skipped: M }
```

---

## Ograniczenia

- Tylko faktury zakupowe (wystawione NA firmę użytkownika)
- Środowisko testowe wymaga testowego tokenu
- Token ma ograniczony czas ważności (sesja)
- Nie obsługuje podpisu kwalifikowanego (tylko token API)
