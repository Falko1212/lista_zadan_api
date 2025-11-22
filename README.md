# TODO API - Menadżer Zadań

**Autor:** [Twoje Imię]

**Grupa:** [Numer grupy]

**Data:** 2024-11-15

## Opis projektu

REST API dla menadżera zadań z zapisem do pliku JSON. Projekt składa się z backendu (Node.js + Express) oraz frontendu (HTML, CSS, JavaScript).

## Technologie

- **Node.js** - Środowisko uruchomieniowe
- **Express.js** - Framework webowy dla Node.js
- **JSON** - Format przechowywania danych
- **HTML5, CSS3, JavaScript** - Frontend
- **Materialize CSS** - Framework CSS dla komponentów UI

## Instalacja i uruchomienie

### Wymagania

- Node.js 18+ (lub nowszy)
- npm (Node Package Manager)

### Krok po kroku

```bash
# 1. Sklonuj repozytorium
git clone [URL_TWOJEGO_REPO]

# 2. Przejdź do katalogu
cd lista_zadan

# 3. Zainstaluj zależności backendu
cd backend
npm install

# 4. Uruchom serwer API
npm start

# Serwer powinien być dostępny pod adresem: http://localhost:3000
```

W osobnym terminalu:

```bash
# 5. Otwórz frontend
cd frontend
# Otwórz plik index.html w przeglądarce
# Lub użyj prostego serwera HTTP (np. Python):
python -m http.server 8080
# Następnie otwórz http://localhost:8080 w przeglądarce
```

## Endpointy API

### 1. GET /health

**Opis:** Sprawdza status API

**Przykład:**
```bash
curl http://localhost:3000/health
```

**Odpowiedź:**
```json
{
  "status": "OK",
  "timestamp": "2024-11-15T10:30:00Z"
}
```

### 2. GET /tasks

**Opis:** Pobiera wszystkie zadania z pliku JSON

**Przykład:**
```bash
curl http://localhost:3000/tasks
```

**Odpowiedź:**
```json
[
  {
    "id": 1,
    "title": "Zrobić zakupy",
    "description": "Mleko, chleb, masło",
    "completed": false,
    "createdAt": "2024-11-15T10:00:00Z"
  },
  {
    "id": 2,
    "title": "Odrobić zadanie z backendu",
    "description": "REST API dla TODO",
    "completed": true,
    "createdAt": "2024-11-15T11:00:00Z"
  }
]
```

Jeśli plik jest pusty:
```json
[]
```

### 3. POST /tasks

**Opis:** Dodaje nowe zadanie i zapisuje do pliku JSON

**Przykład:**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Nowe zadanie","description":"Opis zadania"}'
```

**Request Body:**
```json
{
  "title": "Nowe zadanie",
  "description": "Opis zadania"
}
```

**Odpowiedź (201 Created):**
```json
{
  "id": 3,
  "title": "Nowe zadanie",
  "description": "Opis zadania",
  "completed": false,
  "createdAt": "2024-11-15T12:00:00Z"
}
```

**Zasady:**
- `id` - automatycznie generowane (następny wolny numer)
- `completed` - domyślnie `false`
- `createdAt` - automatycznie ustawiany timestamp
- Dane są zapisywane do pliku `backend/data/tasks.json`

### 4. PUT /tasks/:id

**Opis:** Modyfikuje istniejące zadanie i zapisuje zmiany do pliku

**Przykład:**
```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Zaktualizowany tytuł","description":"Nowy opis","completed":true}'
```

**Request Body (przykład):**
```json
{
  "title": "Zaktualizowany tytuł",
  "description": "Nowy opis",
  "completed": true
}
```

**Odpowiedź (200 OK):**
```json
{
  "id": 1,
  "title": "Zaktualizowany tytuł",
  "description": "Nowy opis",
  "completed": true,
  "createdAt": "2024-11-15T10:00:00Z",
  "updatedAt": "2024-11-15T13:00:00Z"
}
```

**Jeśli zadanie nie istnieje (404 Not Found):**
```json
{
  "error": "Task not found",
  "id": 999
}
```

## Testowanie

API zostało przetestowane używając narzędzia **curl** w terminalu. Wszystkie endpointy działają poprawnie i zapisują dane do pliku JSON.

### Narzędzia do testowania:

- **curl** - narzędzie wiersza poleceń (użyte do testów)
- **Postman** - aplikacja do testowania API
- **Thunder Client** - rozszerzenie VS Code
- **Frontend** - aplikacja webowa w folderze `frontend/`

### Przykładowe testy z rzeczywistymi odpowiedziami:

#### 1. Sprawdzenie statusu API
```bash
curl http://localhost:3000/health
```
**Odpowiedź:**
```json
{"status":"OK","timestamp":"2025-11-22T17:37:46.660Z"}
```

#### 2. Pobranie wszystkich zadań (początkowo pusta lista)
```bash
curl http://localhost:3000/tasks
```
**Odpowiedź:**
```json
[]
```

#### 3. Dodanie nowego zadania
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test zadanie","description":"To jest test"}'
```
**Odpowiedź (201 Created):**
```json
{
  "id": 1,
  "title": "Test zadanie",
  "description": "To jest test",
  "completed": false,
  "createdAt": "2025-11-22T17:37:52.445Z"
}
```

#### 4. Pobranie wszystkich zadań (po dodaniu)
```bash
curl http://localhost:3000/tasks
```
**Odpowiedź:**
```json
[
  {
    "id": 1,
    "title": "Test zadanie",
    "description": "To jest test",
    "completed": false,
    "createdAt": "2025-11-22T17:37:52.445Z"
  }
]
```

#### 5. Aktualizacja zadania
```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Zaktualizowany tytuł","completed":true}'
```
**Odpowiedź (200 OK):**
```json
{
  "id": 1,
  "title": "Zaktualizowany tytuł",
  "description": "To jest test",
  "completed": true,
  "createdAt": "2025-11-22T17:37:52.445Z",
  "updatedAt": "2025-11-22T17:37:55.671Z"
}
```

#### 6. Test obsługi błędów - zadanie nie istnieje (404)
```bash
curl -X PUT http://localhost:3000/tasks/999 \
  -H "Content-Type: application/json" \
  -d '{"title":"Nieistniejące zadanie"}'
```
**Odpowiedź (404 Not Found):**
```json
{"error":"Task not found","id":999}
```

#### 7. Test walidacji - brak wymaganego pola title (400)
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"description":"Brak tytułu"}'
```
**Odpowiedź (400 Bad Request):**
```json
{
  "error": "Bad request",
  "message": "Pole \"title\" jest wymagane i musi być niepustym stringiem"
}
```

### Weryfikacja zapisu do pliku

Po wykonaniu operacji POST i PUT, dane są automatycznie zapisywane do pliku `backend/data/tasks.json`. Można to zweryfikować:

```bash
cat backend/data/tasks.json
```

Plik zawiera wszystkie zadania w formacie JSON zgodnie ze specyfikacją.

## Struktura projektu

```
lista_zadan/
├── backend/
│   ├── server.js          # Główny plik serwera API
│   ├── package.json       # Zależności Node.js
│   ├── data/              # Folder z danymi
│   │   └── tasks.json     # Plik z zadaniami (tworzony automatycznie)
│   └── node_modules/      # Zależności (ignorowane w git)
├── frontend/
│   ├── index.html         # Główny plik HTML
│   ├── app.js             # Logika aplikacji JavaScript
│   └── style.css          # Style CSS
├── .gitignore             # Pliki ignorowane przez git
└── README.md              # Dokumentacja projektu
```

## Struktura pliku tasks.json

Plik `backend/data/tasks.json` jest zapisywany w formacie JSON i zawiera tablicę zadań:

```json
[
  {
    "id": 1,
    "title": "Przykładowe zadanie",
    "description": "To jest opis zadania",
    "completed": false,
    "createdAt": "2024-11-15T10:00:00Z"
  }
]
```

**Wymagania techniczne:**
- Plik jest w katalogu `backend/data/tasks.json`
- Przy każdej operacji POST/PUT dane są zapisywane do pliku
- Przy GET dane są odczytywane z pliku
- Jeśli plik nie istnieje, API automatycznie go tworzy

## Obsługa błędów

API zwraca odpowiednie kody statusu HTTP:

- **200 OK** - Sukces
- **201 Created** - Zasób został utworzony
- **400 Bad Request** - Nieprawidłowe dane wejściowe
- **404 Not Found** - Zasób nie został znaleziony
- **500 Internal Server Error** - Błąd serwera

Przykłady odpowiedzi błędów:

```json
// 400 Bad Request
{
  "error": "Bad request",
  "message": "Pole 'title' jest wymagane i musi być niepustym stringiem"
}

// 404 Not Found
{
  "error": "Task not found",
  "id": 999
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "message": "Nie udało się pobrać zadań"
}
```

## Napotkane problemy i rozwiązania

### Problem 1: CORS (Cross-Origin Resource Sharing)
**Rozwiązanie:** Dodano middleware `cors` w Express, aby umożliwić komunikację między frontendem a backendem.

### Problem 2: Tworzenie folderu data automatycznie
**Rozwiązanie:** Implementacja sprawdza czy folder `data` istnieje i tworzy go automatycznie przy pierwszym użyciu.

### Problem 3: Mapowanie pól między frontendem a API
**Rozwiązanie:** Frontend mapuje pole `completed` z API na `done` dla kompatybilności z istniejącym kodem UI.

## Rozwój

### Uruchomienie w trybie deweloperskim (z auto-reload):

```bash
cd backend
npm run dev  # Wymaga nodemon (zainstalowany jako devDependency)
```

### Dodatkowe funkcjonalności do rozważenia:

- [ ] Endpoint DELETE /tasks/:id - usuwanie zadań
- [ ] Walidacja bardziej zaawansowana
- [ ] Paginacja dla GET /tasks
- [ ] Filtrowanie i sortowanie zadań
- [ ] Autentykacja użytkowników
- [ ] Testy jednostkowe i integracyjne

## Licencja

Ten projekt jest dostępny na licencji MIT.

## Zasoby

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Documentation](https://nodejs.org/)
- [Materialize CSS Documentation](https://materializecss.com/)
- [MDN Web Docs - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Wersja:** 2.0
