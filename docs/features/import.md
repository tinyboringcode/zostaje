# Funkcja — Import danych

Aplikacja obsługuje 3 sposoby importu transakcji.

---

## 1. Import CSV

**Komponent:** `src/components/transactions/CSVImportDialog.tsx`  
**Endpoint:** `POST /api/transactions/import`  
**Parser:** `src/lib/csv-parser.ts`

### Jak używać
1. Pobierz wyciąg CSV z banku
2. Przejdź do Transakcje → Import CSV
3. Przeciągnij plik lub kliknij upload
4. Podejrzyj pierwsze wiersze
5. Wybierz domyślną kategorię (dla nierozpoznanych)
6. Kliknij "Importuj"

### Obsługiwane banki
Parser obsługuje formaty:
| Bank | Format daty | Separator |
|------|-------------|-----------|
| PKO BP | DD.MM.YYYY | `;` |
| mBank | YYYY-MM-DD | `;` |
| ING | DD-MM-YYYY | `;` |
| Santander | DD.MM.YYYY | `;` |
| Alior | DD.MM.YYYY | `;` |
| Inne formaty ISO | YYYY-MM-DD | `,` |

Parser auto-wykrywa format.

### Logika importu
```
1. Parsuj CSV → ParsedTransaction[]
2. Dla każdej transakcji:
   a. Sprawdź duplikaty (hash: data+kwota+opis)
   b. Jeśli nowa → POST /api/transactions
      - Wywołuje categorizer.learnFromTransaction()
   c. Jeśli duplikat → skip
3. Zwróć: { imported: N, skipped: M, errors: [] }
```

---

## 2. Import KSeF

**Endpoint:** `POST /api/ksef/sync`  
**Szczegóły:** [server/ksef.md](../server/ksef.md)

### Jak używać
1. Skonfiguruj token KSeF w Ustawieniach
2. Przejdź do Import → KSeF
3. Kliknij "Synchronizuj faktury"
4. Faktury zostaną dodane jako `ContractorInvoice`

### Co zostaje zaimportowane
- Faktury zakupowe (wystawione NA firmę)
- Tworzony jest `Contractor` po NIP (jeśli nowy)
- Faktura trafia do `ContractorInvoice` ze statusem `pending`
- Transakcja płatności musi być powiązana ręcznie

---

## 3. Folder monitorowany (Watch Folder)

**Endpoint:** `POST /api/import/scan-folder`  
**Konfiguracja:** `Settings.watchFolderPath`, `Settings.watchFolderEnabled`

### Jak działa
1. Skonfiguruj ścieżkę folderu w Ustawieniach
2. Umieść pliki CSV w folderze
3. `scan-folder` skanuje folder i importuje nowe pliki
4. Przetworzone pliki przenoszone do `_processed/`

### Automatyzacja
Endpoint może być wywoływany przez:
- Cron job (np. `crontab -e`)
- Webhook z aplikacji bankowej
- Ręcznie przez UI

```bash
# Przykład cron — skanowanie co godzinę
0 * * * * curl -X POST http://localhost:3000/api/import/scan-folder
```

---

## Komponenty importu

**`src/components/import/ImportClient.tsx`** — Główny widok importu z zakładkami:
- CSV upload
- KSeF sync
- Watch folder status

**`src/components/import/HistoryImportClient.tsx`** — Historia importów, log błędów.
