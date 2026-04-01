# Zmienne środowiskowe

Plik `.env` w katalogu głównym projektu.

---

## Wymagane

| Zmienna | Przykład | Opis |
|---------|---------|------|
| `DATABASE_URL` | `file:./dev.db` | Ścieżka do pliku SQLite |
| `NEXTAUTH_SECRET` | `change-me-secret-32chars` | Sekret sesji (min. 32 znaki w produkcji) |

---

## Opcjonalne

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `APP_PASSWORD` | `` (puste) | Hasło dostępu. Puste = brak ochrony |
| `DOMAIN` | `` | Domena dla Dockera/Traefika (np. `cashflow.example.com`) |

---

## Konfiguracja w UI (nie .env)

Poniższe ustawienia są przechowywane w tabeli `Settings` bazy danych i konfigurowane przez panel Ustawień:

| Ustawienie | Sekcja UI |
|-----------|-----------|
| Dane firmy (nazwa, NIP, adres) | Ustawienia → Firma |
| Forma opodatkowania, etap ZUS | Ustawienia → Podatki |
| URL i model Ollama | Ustawienia → AI |
| Token i środowisko KSeF | Ustawienia → KSeF |
| SMTP (host, port, user, pass) | Ustawienia → E-mail |
| Alerty budżetowe | Ustawienia → Powiadomienia |
| Digest e-mail | Ustawienia → Powiadomienia |
| Ścieżka folderu monitorowanego | Ustawienia → Import |

---

## Przykładowy .env

```env
# Baza danych
DATABASE_URL="file:./prisma/dev.db"

# Sesja
NEXTAUTH_SECRET="zmien-na-losowy-ciag-32-znaki-minimum"

# Opcjonalne hasło dostępu
APP_PASSWORD=""

# Docker/Traefik (opcjonalne)
# DOMAIN="cashflow.example.com"
```

---

## Produkcja

W produkcji zmień:
1. `NEXTAUTH_SECRET` → losowy string 32+ znaków
2. `APP_PASSWORD` → silne hasło
3. `DATABASE_URL` → ścieżka do persystentnego wolumenu (Docker)
4. Skonfiguruj SMTP, Ollama, KSeF przez panel UI po pierwszym uruchomieniu
