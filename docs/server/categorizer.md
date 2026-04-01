# Server — Kategoryzator ML

**Plik:** `src/server/categorizer.ts`  
**Model:** `CategoryRule` (tabela w SQLite)

---

## Koncepcja

Prosty model ML oparty na zliczaniu tokenów. Uczy się z każdej nowej transakcji i poprawia z czasem.

Nie wymaga zewnętrznych modeli — działa lokalnie i staje się lepszy wraz z ilością danych.

---

## `tokenize(text)`

Przetwarza tekst na tokeny.

**Algorytm:**
1. Lowercase
2. Usuń polskie znaki diakrytyczne (ą→a, ę→e, ó→o, itd.)
3. Podziel wg spacji i znaków specjalnych
4. Odfiltruj stop words i tokeny < 3 znaków

**Polskie stop words:** `z`, `do`, `na`, `za`, `ze`, `i`, `w`, `lub`, `dla`, `przez` + cyfry, etc.

**Przykład:**
```ts
tokenize("Faktura za usługi IT dla klienta ABC")
// → ["faktura", "uslugi", "klienta", "abc"]
```

---

## `learnFromTransaction(tx)`

Wywołuje się automatycznie przy każdym `POST /api/transactions`.

**Działanie:**
1. Tokenizuje `tx.description`
2. Dla każdego tokenu: upsert w `CategoryRule`
   - Jeśli istnieje: `count += 1`
   - Jeśli nie: utwórz z `count = 1`
3. Rejestruje `txType` (INCOME/EXPENSE) dla precyzji

**Efekt:** Im więcej transakcji z danym opisem → wyższe `count` → wyższa pewność sugestii.

---

## `suggestCategory(description, type, categories)`

Sugeruje kategorię dla nowej transakcji.

**Algorytm:**
1. Tokenizuj `description`
2. Dla każdego tokenu: znajdź matching `CategoryRule` z `count`
3. Sumuj `count` per `categoryId` → ranking
4. Normalizuj (score = suma / max_suma)
5. Jeśli najwyższy score ≥ 0.4 → sugeruj tę kategorię

**Zwraca:**
```ts
{
  categoryId: string | null,
  confidence: number          // 0.0–1.0
}
```

**Przykład:** Po 50 transakcjach opisanych "hosting" → CategoryRule dla kategorii "Infrastruktura" ma count=50 dla tokenu "hosting". Następna transakcja "hosting Cloudflare" → score 1.0 → pewna sugestia.

---

## Integracja

```
POST /api/transactions
    └─ categorizer.learnFromTransaction(newTx)
           └─ prisma.categoryRule.upsert(...)

POST /api/ai/categorize
    └─ categorizer.suggestCategory(description, type, categories)
           └─ prisma.categoryRule.findMany(...)
```

Fallback: jeśli Ollama niedostępna → `suggestCategory()` jako backup.
