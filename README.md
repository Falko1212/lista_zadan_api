# API ToDo z Supabase

REST API dla aplikacji ToDo z autoryzacją JWT, rolami użytkowników i Row Level Security.

## Szybki start

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
Otwórz `frontend/index.html` w przeglądarce

## Konfiguracja

1. Skopiuj `.env.example` do `.env`
2. Wypełnij klucze Supabase
3. Wykonaj skrypty SQL z `supabase-setup.sql` w Supabase SQL Editor
4. Włącz Custom Access Token Hook w Supabase (Authentication → Hooks)

Szczegóły: [SETUP.md](SETUP.md)

## Endpointy API

### Autoryzacja
- `POST /auth/register` - rejestracja
- `POST /auth/login` - logowanie

### Taski (wymagają autoryzacji)
- `GET /tasks` - lista tasków
- `POST /tasks` - nowy task
- `PATCH /tasks/:id` - aktualizacja
- `DELETE /tasks/:id` - usunięcie

### Admin (tylko dla adminów)
- `GET /admin/users` - lista użytkowników
- `DELETE /admin/users/:id` - usunięcie użytkownika

## Technologie

- **Backend:** Node.js, Express, Supabase
- **Frontend:** HTML, JavaScript (Vanilla)
- **Baza:** PostgreSQL (Supabase)
- **Autoryzacja:** JWT (Supabase Auth)

## Struktura bazy

- `public.profiles` - profile użytkowników (id, email, role)
- `public.tasks` - zadania (id, title, completed, user_id)
- Row Level Security - użytkownicy widzą tylko swoje taski

## Licencja

MIT
