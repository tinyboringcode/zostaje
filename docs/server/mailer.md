# Server — Mailer (Powiadomienia e-mail)

**Plik:** `src/server/mailer.ts`  
**Zależność:** `nodemailer`  
**Konfiguracja:** Tabela `Settings` (SMTP)

---

## Architektura

Mailer NIE używa stałej konfiguracji — pobiera ustawienia SMTP z bazy danych przed każdym wysłaniem. To umożliwia zmianę konfiguracji przez UI bez restartu aplikacji.

---

## `getTransporter()`

Ładuje konfigurację SMTP z `Settings` (id=1) i tworzy transporter Nodemailer.

```ts
const transporter = nodemailer.createTransport({
  host: settings.smtpHost,
  port: settings.smtpPort,
  secure: settings.smtpPort === 465,
  auth: {
    user: settings.smtpUser,
    pass: settings.smtpPass
  }
})
```

Jeśli `smtpEnabled=false` → rzuca błąd (nie wysyła).

---

## `sendMail(options)`

Wysyła e-mail i loguje wynik do `NotificationLog`.

```ts
await sendMail({
  to: settings.notificationEmail,
  subject: "Alert budżetowy",
  html: budgetAlertHtml(data)
})
```

**Zawsze:**
1. Wysyła e-mail przez Nodemailer
2. Zapisuje do `NotificationLog`: typ, temat, data, sukces/błąd

---

## Szablony HTML

### `budgetAlertHtml(data)`

Alert o przekroczeniu budżetu.

**Dane:** `{ categoryName, spent, limit, pct, month }`

**Wygląd:**
- Nagłówek z nazwą aplikacji
- Karta kategorii z emoji i kolorem
- Progress bar (żółty 80-99%, czerwony 100%+)
- Tabela: wydano / limit / procent
- Stopka z linkiem do aplikacji

### `digestHtml(data)`

Tygodniowe/dzienne podsumowanie.

**Dane:** `{ period, income, expense, profit, topCategories[], txCount }`

**Wygląd:**
- Nagłówek z okresem
- Karty KPI (przychody, koszty, zysk)
- Tabela top 5 kategorii kosztowych
- Liczba transakcji w okresie

### `overdueInvoiceHtml(data)`

Przypomnienie o niezapłaconych fakturach.

**Dane:** `{ invoices[] { contractor, number, amount, dueDate, daysOverdue } }`

**Wygląd:**
- Lista przeterminowanych faktur
- Kolory wg liczby dni po terminie (żółty < 14, czerwony ≥ 14)
- Łączna kwota zaległości

---

## Endpointy API powiadomień

| Endpoint | Opis |
|----------|------|
| `POST /api/notifications/check-budgets` | Sprawdza budżety + zaległe faktury, wysyła alerty |
| `POST /api/notifications/digest` | Wymusza wysłanie digestu |
| `POST /api/notifications/test` | Wysyła testowy e-mail (debug SMTP) |
| `GET /api/notifications/logs` | Historia z `NotificationLog` |

---

## Logika `check-budgets`

```
1. Pobierz Settings → budgetAlertEnabled, threshold, notifyInterval
2. Sprawdź notifyInterval:
   - immediate: zawsze
   - daily: tylko jeśli lastBudgetCheckAt > 24h temu
   - weekly: tylko jeśli lastBudgetCheckAt > 7 dni temu
3. Dla każdego budżetu w bieżącym miesiącu:
   - Oblicz sumę wydatków z TX
   - Jeśli pct >= threshold → budgetAlertHtml() → sendMail()
4. Dla każdej faktury z dueDate < teraz && paidAt=null:
   - Ustaw status=overdue
   - overdueInvoiceHtml() → sendMail()
5. Zapisz lastBudgetCheckAt = teraz
```
