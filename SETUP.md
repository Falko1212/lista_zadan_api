# Instrukcja konfiguracji projektu ToDo API z Supabase

## 1. Wymagania wstępne

- Node.js (v14 lub nowszy)
- Konto Supabase (https://supabase.com)
- Utworzony projekt w Supabase

## 2. Konfiguracja Supabase

### 2.1. Wykonanie skryptów SQL

1. Zaloguj się do dashboard Supabase: https://supabase.com/dashboard
2. Wybierz swój projekt
3. Przejdź do **SQL Editor** (ikona w lewym menu)
4. Kliknij **New query**
5. Skopiuj i wklej zawartość pliku `backend/supabase-setup.sql`
6. Kliknij **Run** (lub Ctrl/Cmd + Enter)

Skrypt utworzy:
- Tabele `profiles` i `tasks`
- Trigger automatycznie tworzący profil przy rejestracji
- Funkcję `custom_access_token_hook` dodającą rolę do JWT
- Polityki Row Level Security (RLS)

### 2.2. Włączenie Custom Access Token Hook

1. W dashboard Supabase przejdź do **Authentication** → **Hooks**
2. Znajdź sekcję **"Customize Access Token (JWT) Claims"**
3. Włącz hook (przełącznik ON)
4. W polu **"Postgres Function"** wybierz: `public.custom_access_token_hook`
5. Kliknij **Save**

### 2.3. Pobranie kluczy API

1. Przejdź do **Settings** (ikona koła zębatego) → **API**
2. Skopiuj następujące wartości:
   - **Project URL** (np. `https://xxxxx.supabase.co`)
   - **anon/public key** (długi token JWT)
   - **service_role key** (jeszcze dłuższy token JWT - **wrażliwy!**)

## 3. Konfiguracja backendu

### 3.1. Utworzenie pliku .env

1. Przejdź do katalogu `backend/`
2. Skopiuj plik `.env.example` do `.env`:
   ```bash
   cp .env.example .env
   ```
3. Otwórz plik `.env` i uzupełnij wartości:
   ```
   SUPABASE_URL=https://twoj-projekt.supabase.co
   SUPABASE_ANON_KEY=twoj-anon-key-tutaj
   SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key-tutaj
   PORT=3000
   ```

### 3.2. Instalacja zależności

```bash
cd backend
npm install
```

### 3.3. Uruchomienie serwera

```bash
npm start
```

Serwer powinien uruchomić się na `http://localhost:3000`

## 4. Testowanie API

### 4.1. Sprawdzenie statusu

```bash
curl http://localhost:3000/health
```

Oczekiwana odpowiedź:
```json
{
  "status": "OK",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

### 4.2. Rejestracja użytkownika

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"haslo123"}'
```

### 4.3. Logowanie

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"haslo123"}'
```

Zapisz otrzymany `token` - będzie potrzebny do dalszych requestów.

### 4.4. Utworzenie taska

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer TWOJ_TOKEN_TUTAJ" \
  -H "Content-Type: application/json" \
  -d '{"title":"Moje pierwsze zadanie"}'
```

### 4.5. Pobranie tasków

```bash
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer TWOJ_TOKEN_TUTAJ"
```

## 5. Nadanie roli administratora

Aby nadać użytkownikowi rolę administratora:

1. Przejdź do **SQL Editor** w Supabase
2. Wykonaj zapytanie:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'test@example.com';
   ```
3. Użytkownik musi się **wylogować i zalogować ponownie**, aby otrzymać nowy token z rolą admin

## 6. Weryfikacja tokena JWT

Aby sprawdzić czy token zawiera pole `user_role`:

1. Skopiuj token otrzymany po zalogowaniu
2. Przejdź na stronę: https://jwt.io
3. Wklej token w sekcji "Encoded"
4. W sekcji "Decoded" → "Payload" powinieneś zobaczyć pole `user_role` z wartością `user` lub `admin`

## 7. Rozwiązywanie problemów

### Błąd: "No token provided"
- Upewnij się, że wysyłasz nagłówek `Authorization: Bearer <token>`
- Sprawdź czy token nie wygasł (domyślnie ważny 1 godzinę)

### Błąd: "Failed to fetch user profile"
- Sprawdź czy trigger `on_auth_user_created` został utworzony
- Sprawdź czy tabela `profiles` istnieje
- Sprawdź logi w Supabase: Database → Logs

### Token nie zawiera pola user_role
- Sprawdź czy Custom Access Token Hook jest włączony
- Sprawdź czy funkcja `custom_access_token_hook` ma odpowiednie uprawnienia
- Wyloguj się i zaloguj ponownie (stary token nie zostanie zaktualizowany)

### RLS blokuje dostęp
- Sprawdź czy polityki RLS zostały utworzone
- Sprawdź czy token jest prawidłowy
- Dla testów możesz tymczasowo wyłączyć RLS:
  ```sql
  ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
  ```
  (Pamiętaj aby włączyć ponownie po testach!)

## 8. Struktura projektu

```
lista_zadan_api/
├── backend/
│   ├── config/
│   │   └── supabase.js          # Konfiguracja klienta Supabase
│   ├── middleware/
│   │   └── auth.js              # Middleware autoryzacji JWT
│   ├── .env                     # Zmienne środowiskowe (NIE commitować!)
│   ├── .env.example             # Szablon .env
│   ├── package.json
│   ├── server.js                # Główny plik serwera
│   └── supabase-setup.sql       # Skrypt SQL do konfiguracji bazy
└── frontend/
    ├── index.html
    ├── app.js
    └── style.css
```
