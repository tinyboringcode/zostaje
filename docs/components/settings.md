# Komponenty — Ustawienia

Ścieżka: `src/components/settings/`  
Strona: `src/app/(app)/settings/page.tsx`

---

## SettingsClient

**Plik:** `src/components/settings/SettingsClient.tsx`

Formularz konfiguracji całej aplikacji. Dane zapisywane w `Settings` (singleton id=1).

### Zakładki

#### Firma
Podstawowe dane firmy:
- Nazwa firmy
- NIP
- Adres
- Waluta (domyślnie PLN)
- Data założenia firmy (wpływa na obliczenie etapu ZUS)

#### Podatki
Konfiguracja podatkowa:
- Forma opodatkowania: Skala / Liniowy / Ryczałt
- Stawka ryczałtu (jeśli ryczałt: 2%, 3%, 5.5%, 8.5%, 10%, 12%, 14%, 17%)
- Etap ZUS: Ulga na start / Mały ZUS / Mały ZUS Plus / Pełny
- Podatnik VAT: tak/nie
- Okres VAT: miesięczny / kwartalny

#### AI
Konfiguracja Ollama:
- Włącz AI: toggle
- URL Ollama (domyślnie `http://localhost:11434`)
- Model: llama3.2 / llava / mistral / gemma2

Przycisk "Testuj połączenie" → sprawdza dostępność Ollama.

#### KSeF
Integracja z polskim systemem e-faktur:
- Włącz KSeF: toggle
- Token API
- Środowisko: Test / Produkcja

#### E-mail / Powiadomienia
**SMTP:**
- Serwer SMTP
- Port
- Użytkownik
- Hasło
- Adres docelowy powiadomień

Przycisk "Wyślij testowy e-mail".

**Alerty budżetowe:**
- Włącz alerty: toggle
- Próg % (domyślnie 80%)
- Częstotliwość: natychmiast / dziennie / tygodniowo

**Digest:**
- Włącz digest: toggle
- Częstotliwość: dzienny / tygodniowy / miesięczny
- Liczba dni wstecz

#### Import
Folder monitorowany:
- Ścieżka do folderu
- Włącz monitoring: toggle

#### Faktury
Numeracja faktur:
- Wzorzec (`FV/{YYYY}/{NNN}`)
- Aktualny licznik

### Zapis

`PUT /api/settings` — pełna podmiana wszystkich ustawień.

Po pierwszym zapisie → ustawia cookie `onboarding_done=1`.

### Dane (TanStack Query)
- `useQuery(["settings"])` → `GET /api/settings`
- `useMutation(save)` → `PUT /api/settings`
