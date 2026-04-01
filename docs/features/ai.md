# Funkcja — AI (Ollama)

**Integracja:** Ollama (lokalny LLM)  
**Konfiguracja:** `Settings.ollamaUrl`, `Settings.ollamaModel`, `Settings.ollamaEnabled`

---

## Koncepcja

Aplikacja integruje się z **Ollama** — lokalnym serwerem LLM działającym na maszynie użytkownika. Brak wysyłania danych do chmury.

Domyślnie Ollama działa na `http://localhost:11434`.

---

## Konfiguracja

1. Zainstaluj Ollama: `https://ollama.ai`
2. Pobierz model: `ollama pull llama3.2`
3. W Ustawieniach skonfiguruj:
   - URL: `http://localhost:11434`
   - Model: `llama3.2` (tekst) lub `llava` (obrazy/OCR)
   - Włącz AI

---

## Obsługiwane modele

| Model | Rozmiar | Zastosowanie |
|-------|---------|--------------|
| `llama3.2` | 2GB | Kategoryzacja, analiza tekstu |
| `mistral` | 4GB | Lepsza analiza |
| `gemma2` | 5GB | Alternatywa Google |
| `llava` | 4GB | OCR paragonów (multimodal) |

---

## Endpoints AI

### `POST /api/ai/categorize`

Sugestia kategorii dla nowej transakcji.

**Żądanie:**
```json
{
  "description": "Faktura Cloudflare Workers",
  "amount": 150,
  "type": "EXPENSE"
}
```

**Prompt do Ollama:**
```
Jesteś asystentem finansowym dla polskiej JDG.
Kategoryzuj transakcję:
- Opis: "Faktura Cloudflare Workers"
- Kwota: 150 PLN
- Typ: EXPENSE

Dostępne kategorie: Hosting (id: clx1), Marketing (id: clx2), ...

Odpowiedz tylko JSON: {"categoryId": "...", "confidence": 0.0-1.0}
```

**Fallback:** Jeśli Ollama niedostępna → `categorizer.suggestCategory()` (ML lokalne).

**Odpowiedź:**
```json
{ "categoryId": "clx1...", "confidence": 0.92 }
```

### `POST /api/ai/analyze`

Analiza wzorców transakcji.

**Prompt:** Wysyła ostatnie 50 transakcji + prosi o insights w języku polskim.

**Odpowiedź:** Tekst z obserwacjami (np. "Twoje koszty marketingowe wzrosły o 30% w tym kwartale...").

**Demo feature** — wyniki mogą być mniej precyzyjne.

### `POST /api/ai/receipt`

OCR paragonu z obrazu.

**Wymaga:** Model `llava` (multimodal).

**Żądanie:** FormData z plikiem obrazu.

**Prompt:**
```
Przeanalizuj ten paragon i wyodrębnij:
- Łączna kwota
- Data
- Nazwa sprzedawcy
- Pozycje (opcjonalnie)

Odpowiedz JSON: {"amount": N, "date": "...", "vendor": "...", "items": [...]}
```

**Demo feature** — dokładność zależy od jakości zdjęcia i modelu.

---

## AIDemoClient

**Plik:** `src/components/ai-demo/AIDemoClient.tsx`  
**Strona:** `src/app/(app)/ai-demo/page.tsx`

Demo interfejs do testowania funkcji AI:
1. Wpisz opis transakcji → "Kategoryzuj" → sugestia z pewnością
2. Upload zdjęcia paragonu → "Analizuj" → dane z paragonu

---

## Integracja z TransactionForm

`TransactionForm` automatycznie woła `POST /api/ai/categorize` po wpisaniu opisu:
- Debounce 500ms od ostatniego keystroke
- Wyświetla sugestię kategorii z pewnością
- "Użyj sugestii" → auto-fill Select

---

## Ograniczenia

- Wymaga lokalnej instalacji Ollama
- Prędkość zależy od sprzętu (CPU/GPU)
- Nie działa bez Ollama (graceful degradation do ML lokalnego)
- OCR paragonów jest funkcją demo — nie produkcyjną
