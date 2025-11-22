# Code Review - TODO API Project

**Data:** 2025-11-22  
**Wersja:** 2.0  
**Przeglądane pliki:** 
- `backend/server.js`
- `frontend/app.js`
- `frontend/index.html`
- `frontend/style.css`
- `backend/package.json`
- `README.md`

---

## 📋 Podsumowanie

Projekt został poprawnie podzielony na backend (REST API) i frontend. Wszystkie wymagane endpointy są zaimplementowane i działają poprawnie. Kod jest czytelny i dobrze zorganizowany. Zidentyfikowano kilka obszarów do poprawy w zakresie bezpieczeństwa, obsługi błędów i best practices.

---

## ✅ Pozytywne Aspekty

### Backend
1. **Czysta struktura kodu** - czytelna organizacja endpointów
2. **Dobre funkcje pomocnicze** - `readTasks()` i `writeTasks()` są dobrze wydzielone
3. **Automatyczne tworzenie folderów** - folder `data/` jest tworzony automatycznie
4. **Walidacja danych** - sprawdzanie typów i wartości
5. **Obsługa błędów** - try-catch w odpowiednich miejscach
6. **CORS** - poprawnie skonfigurowany dla komunikacji frontend-backend
7. **Spójne odpowiedzi API** - jednolity format odpowiedzi błędów
8. **Zapis do pliku JSON** - zgodnie z wymaganiami, dane są zapisywane do pliku

### Frontend
1. **Użycie Fetch API** - nowoczesne podejście do komunikacji z API
2. **Funkcja `escapeHtml()`** - zapobiega atakom XSS
3. **Obsługa błędów API** - funkcja `handleApiError()` do centralnej obsługi błędów
4. **Materialize CSS** - spójny design
5. **Responsywność** - viewport meta tag
6. **Filtrowanie zadań** - dobrze zaimplementowane

---

## 🔴 Krytyczne Problemy

### 1. **Backend: Brak walidacji rozmiaru danych wejściowych**
**Lokalizacja:** `backend/server.js:86-131`

**Problem:**
- Brak limitu długości `title` i `description`
- Możliwość wysłania bardzo długich stringów, co może powodować problemy z pamięcią i plikiem JSON

**Kod problemowy:**
```javascript
const { title, description } = req.body;
// Brak sprawdzenia długości
```

**Rozwiązanie:**
```javascript
if (title.length > 200) {
    return res.status(400).json({
        error: 'Bad request',
        message: 'Tytuł nie może przekraczać 200 znaków'
    });
}
if (description && description.length > 1000) {
    return res.status(400).json({
        error: 'Bad request',
        message: 'Opis nie może przekraczać 1000 znaków'
    });
}
```

**Priorytet:** WYSOKI

---

### 2. **Backend: Race condition przy równoczesnych zapisach**
**Lokalizacja:** `backend/server.js:46-61, 119-120, 191`

**Problem:**
- Jeśli wiele requestów jednocześnie modyfikuje zadania, mogą się nadpisać
- Brak mechanizmu blokowania pliku podczas zapisu

**Przykład problemu:**
1. Request A czyta tasks.json (ma 2 zadania)
2. Request B czyta tasks.json (ma 2 zadania)
3. Request A dodaje zadanie #3 i zapisuje (3 zadania)
4. Request B dodaje zadanie #4 i zapisuje (3 zadania - nadpisuje zapis A)

**Rozwiązanie:**
- Użyć mutex/lock mechanism
- Lub użyć bazy danych zamiast pliku JSON dla produkcji
- Lub dodać queue dla zapisów

**Priorytet:** WYSOKI (dla produkcji)

---

### 3. **Frontend: Funkcje wywoływane przez inline handlers nie są globalne**
**Lokalizacja:** `frontend/app.js:260, 269, 273`

**Problem:**
- Funkcje `toggleTask()`, `editTask()`, `deleteTask()` są wywoływane przez `onclick`/`onchange`
- Nie są eksportowane do globalnego zakresu `window`
- W niektórych kontekstach może powodować `ReferenceError`

**Kod problemowy:**
```javascript
onchange="toggleTask(${task.id})"
onclick="editTask(${task.id})"
onclick="deleteTask(${task.id})"
```

**Rozwiązanie:**
```javascript
// Na końcu pliku app.js
window.toggleTask = toggleTask;
window.editTask = editTask;
window.deleteTask = deleteTask;
```

Lub użyć event delegation (lepsze rozwiązanie):
```javascript
document.getElementById('taskList').addEventListener('change', function(e) {
    if (e.target.type === 'checkbox') {
        const taskId = parseInt(e.target.dataset.taskId);
        toggleTask(taskId);
    }
});
```

**Priorytet:** WYSOKI

---

### 4. **Backend: Brak walidacji formatu JSON w pliku**
**Lokalizacja:** `backend/server.js:27-31`

**Problem:**
- Jeśli plik `tasks.json` zostanie uszkodzony (nieprawidłowy JSON), `JSON.parse()` rzuci błąd
- Aplikacja może się crashować

**Kod problemowy:**
```javascript
return JSON.parse(data);
```

**Rozwiązanie:**
```javascript
try {
    return JSON.parse(data);
} catch (parseError) {
    console.error('Błąd parsowania JSON:', parseError);
    // Utwórz backup uszkodzonego pliku
    await fs.writeFile(TASKS_FILE + '.backup', data, 'utf8');
    // Zwróć pustą tablicę
    return [];
}
```

**Priorytet:** WYSOKI

---

## 🟡 Poważne Problemy

### 5. **Backend: Brak rate limiting**
**Lokalizacja:** Cały plik `server.js`

**Problem:**
- Brak ochrony przed nadmierną liczbą requestów
- Możliwość DoS przez wielokrotne zapisy do pliku

**Rozwiązanie:**
- Dodać `express-rate-limit` middleware
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 100 // maksymalnie 100 requestów na IP
});

app.use('/tasks', limiter);
```

**Priorytet:** ŚREDNI (wysoki dla produkcji)

---

### 6. **Frontend: Użycie przestarzałych metod UI (alert, prompt, confirm)**
**Lokalizacja:** `frontend/app.js:39, 75, 118, 122, 147, 178, 181`

**Problem:**
- `alert()`, `prompt()`, `confirm()` blokują wątek i mają złe UX
- Nie są dostępne na urządzeniach mobilnych w niektórych kontekstach
- Nie są zgodne z Material Design

**Rozwiązanie:**
- Użyć modali Materialize CSS
- Lub stworzyć własne komponenty modalne

**Priorytet:** ŚREDNI

---

### 7. **Backend: Brak logowania (logging)**
**Lokalizacja:** `backend/server.js`

**Problem:**
- Tylko `console.error()` - nie nadaje się do produkcji
- Brak strukturyzowanych logów
- Brak logowania requestów

**Rozwiązanie:**
- Dodać `winston` lub `morgan` dla logowania
```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

**Priorytet:** ŚREDNI

---

### 8. **Frontend: Brak obsługi timeout dla requestów**
**Lokalizacja:** `frontend/app.js:45, 80, 134, 185`

**Problem:**
- Fetch API nie ma domyślnego timeout
- Request może wisieć w nieskończoność

**Rozwiązanie:**
```javascript
function fetchWithTimeout(url, options, timeout = 5000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}
```

**Priorytet:** ŚREDNI

---

### 9. **Backend: Brak walidacji ID przy generowaniu**
**Lokalizacja:** `backend/server.js:102-105`

**Problem:**
- Jeśli zadania zostaną usunięte ręcznie z pliku, ID mogą się powtarzać
- `Math.max()` może zwrócić `-Infinity` jeśli tablica jest pusta

**Kod problemowy:**
```javascript
const maxId = tasks.length > 0 
    ? Math.max(...tasks.map(task => task.id))
    : 0;
```

**Rozwiązanie:**
```javascript
let maxId = 0;
if (tasks.length > 0) {
    const ids = tasks.map(task => task.id || 0).filter(id => typeof id === 'number');
    maxId = ids.length > 0 ? Math.max(...ids) : 0;
}
const newId = maxId + 1;
```

**Priorytet:** ŚREDNI

---

### 10. **Frontend: Brak walidacji przed wysłaniem do API**
**Lokalizacja:** `frontend/app.js:191-192`

**Problem:**
- W `editTask()` nie ma walidacji czy `newTitle.trim()` nie jest pusty
- Można wysłać pusty tytuł do API

**Rozwiązanie:**
```javascript
if (newTitle.trim() === '') {
    alert('Tytuł nie może być pusty');
    return;
}
```

**Priorytet:** ŚREDNI

---

## 🟢 Problemy Drobne / Sugestie

### 11. **Backend: Duplikacja kodu tworzenia folderu**
**Lokalizacja:** `backend/server.js:17-23, 48-54`

**Problem:**
- Kod tworzenia folderu `data/` jest zduplikowany w `readTasks()` i `writeTasks()`

**Rozwiązanie:**
```javascript
async function ensureDataDir() {
    const dataDir = path.dirname(TASKS_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}
```

**Priorytet:** NISKI

---

### 12. **Backend: Brak walidacji czy tasks jest tablicą**
**Lokalizacja:** `backend/server.js:31, 99`

**Problem:**
- Po `JSON.parse()` nie ma sprawdzenia czy wynik jest tablicą

**Rozwiązanie:**
```javascript
const parsed = JSON.parse(data);
if (!Array.isArray(parsed)) {
    console.error('Plik tasks.json nie zawiera tablicy');
    return [];
}
return parsed;
```

**Priorytet:** NISKI

---

### 13. **Frontend: Hardcoded URL API**
**Lokalizacja:** `frontend/app.js:4`

**Problem:**
- URL API jest hardcoded
- Trudne do zmiany dla różnych środowisk (dev, prod)

**Rozwiązanie:**
```javascript
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
```

Lub użyć zmiennych środowiskowych w build process.

**Priorytet:** NISKI

---

### 14. **Frontend: Brak loading state**
**Lokalizacja:** `frontend/app.js:43-62`

**Problem:**
- Brak wskaźnika ładowania podczas pobierania zadań
- Użytkownik nie wie czy aplikacja działa

**Rozwiązanie:**
- Dodać spinner podczas ładowania
- Pokazać "Ładowanie..." podczas requestów

**Priorytet:** NISKI

---

### 15. **Backend: Brak endpointu DELETE**
**Lokalizacja:** Brak implementacji

**Problem:**
- Frontend ma funkcję `deleteTask()`, ale nie ma endpointu DELETE w API
- Usuwanie działa tylko lokalnie

**Rozwiązanie:**
```javascript
app.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        if (isNaN(taskId)) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Nieprawidłowe ID zadania'
            });
        }

        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({
                error: 'Task not found',
                id: taskId
            });
        }

        tasks.splice(taskIndex, 1);
        await writeTasks(tasks);

        res.status(204).send();
    } catch (error) {
        console.error('Błąd podczas usuwania zadania:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się usunąć zadania'
        });
    }
});
```

**Priorytet:** NISKI (ale przydatne)

---

### 16. **Backend: Brak walidacji czy ID jest liczbą całkowitą**
**Lokalizacja:** `backend/server.js:136`

**Problem:**
- `parseInt("1.5")` zwróci `1` zamiast błędu
- Powinno sprawdzać czy ID jest liczbą całkowitą

**Rozwiązanie:**
```javascript
const taskId = parseInt(req.params.id);
if (isNaN(taskId) || !Number.isInteger(Number(req.params.id))) {
    return res.status(400).json({
        error: 'Bad request',
        message: 'ID musi być liczbą całkowitą'
    });
}
```

**Priorytet:** NISKI

---

### 17. **Frontend: Brak obsługi pustej odpowiedzi**
**Lokalizacja:** `frontend/app.js:49`

**Problem:**
- Jeśli API zwróci pustą odpowiedź, `response.json()` może rzucić błąd

**Rozwiązanie:**
```javascript
const text = await response.text();
const tasks = text ? JSON.parse(text) : [];
```

**Priorytet:** NISKI

---

### 18. **Backend: Brak dokumentacji JSDoc**
**Lokalizacja:** Cały plik `server.js`

**Problem:**
- Funkcje nie mają dokumentacji JSDoc

**Rozwiązanie:**
```javascript
/**
 * Odczytuje zadania z pliku JSON
 * @returns {Promise<Array>} Tablica zadań
 * @throws {Error} Jeśli wystąpi błąd odczytu pliku
 */
async function readTasks() {
    // ...
}
```

**Priorytet:** NISKI

---

### 19. **Frontend: Niespójne mapowanie pól**
**Lokalizacja:** `frontend/app.js:50-54, 98-99, 161-163, 214-215`

**Problem:**
- Mapowanie `completed` ↔ `done` jest wykonywane w wielu miejscach
- Może prowadzić do błędów

**Rozwiązanie:**
- Użyć jednej funkcji pomocniczej do mapowania
- Lub całkowicie przejść na `completed` w frontendzie

**Priorytet:** NISKI

---

### 20. **Backend: Brak middleware do walidacji**
**Lokalizacja:** `backend/server.js`

**Problem:**
- Walidacja jest powtarzana w każdym endpoincie
- Można użyć middleware (np. `express-validator`)

**Rozwiązanie:**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/tasks', 
    body('title').trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // ...
    }
);
```

**Priorytet:** NISKI

---

## 🔒 Bezpieczeństwo

### Zidentyfikowane problemy:

1. **Brak rate limiting** - możliwość DoS
2. **Brak walidacji rozmiaru danych** - możliwość ataku na pamięć
3. **Brak sanitizacji danych** - chociaż `escapeHtml()` w frontendzie pomaga
4. **CORS jest otwarty dla wszystkich** - w produkcji powinien być ograniczony
5. **Brak autentykacji** - API jest publiczne (ale zgodnie z wymaganiami)

### Rekomendacje:

```javascript
// Ograniczenie CORS w produkcji
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
```

---

## 📊 Statystyki

- **Krytyczne problemy:** 4
- **Poważne problemy:** 6
- **Drobne problemy:** 10
- **Pozytywne aspekty:** 14

---

## 🎯 Rekomendacje Priorytetowe

### Natychmiast (Przed wdrożeniem do produkcji):
1. ✅ Dodać walidację rozmiaru danych wejściowych
2. ✅ Naprawić dostępność funkcji dla inline handlers
3. ✅ Dodać obsługę uszkodzonego pliku JSON
4. ✅ Rozwiązać problem race condition (lub użyć bazy danych)

### Wkrótce (W następnej iteracji):
5. ✅ Dodać rate limiting
6. ✅ Zastąpić alert/prompt/confirm modalami
7. ✅ Dodać logging
8. ✅ Dodać timeout dla requestów
9. ✅ Dodać walidację ID

### W przyszłości (Refaktoryzacja):
10. ✅ Dodać endpoint DELETE
11. ✅ Dodać testy jednostkowe i integracyjne
12. ✅ Dodać CI/CD
13. ✅ Rozważyć użycie bazy danych zamiast pliku JSON
14. ✅ Dodać dokumentację API (Swagger/OpenAPI)
15. ✅ Dodać monitoring i alerting

---

## 🔧 Przykładowe Poprawki

### Poprawka 1: Walidacja rozmiaru danych
```javascript
// W POST /tasks
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;

if (title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({
        error: 'Bad request',
        message: `Tytuł nie może przekraczać ${MAX_TITLE_LENGTH} znaków`
    });
}

if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({
        error: 'Bad request',
        message: `Opis nie może przekraczać ${MAX_DESCRIPTION_LENGTH} znaków`
    });
}
```

### Poprawka 2: Event Delegation w Frontend
```javascript
// Zamiast inline handlers
document.getElementById('taskList').addEventListener('change', function(e) {
    if (e.target.type === 'checkbox') {
        const taskId = parseInt(e.target.closest('[data-task-id]').dataset.taskId);
        toggleTask(taskId);
    }
});

document.getElementById('taskList').addEventListener('click', function(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    
    if (editBtn) {
        const taskId = parseInt(editBtn.dataset.taskId);
        editTask(taskId);
    }
    
    if (deleteBtn) {
        const taskId = parseInt(deleteBtn.dataset.taskId);
        deleteTask(taskId);
    }
});
```

### Poprawka 3: Bezpieczne parsowanie JSON
```javascript
async function readTasks() {
    try {
        const dataDir = path.dirname(TASKS_FILE);
        await ensureDataDir(dataDir);

        try {
            const data = await fs.readFile(TASKS_FILE, 'utf8');
            if (data.trim() === '') {
                return [];
            }
            
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) {
                console.error('Plik tasks.json nie zawiera tablicy');
                // Utwórz backup
                await fs.writeFile(TASKS_FILE + '.backup', data, 'utf8');
                return [];
            }
            
            return parsed;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            if (error instanceof SyntaxError) {
                console.error('Błąd parsowania JSON:', error);
                // Utwórz backup uszkodzonego pliku
                try {
                    const corruptedData = await fs.readFile(TASKS_FILE, 'utf8');
                    await fs.writeFile(TASKS_FILE + '.backup', corruptedData, 'utf8');
                } catch (e) {
                    // Ignoruj błędy backupu
                }
                return [];
            }
            throw error;
        }
    } catch (error) {
        console.error('Błąd odczytu pliku:', error);
        throw error;
    }
}
```

---

## 📝 Wnioski

Projekt jest **funkcjonalny i spełnia wszystkie wymagania**. Kod jest **czytelny i dobrze zorganizowany**. 

**Główne obszary do poprawy:**
- **Bezpieczeństwo** - walidacja danych, rate limiting
- **Stabilność** - obsługa edge cases, race conditions
- **UX** - lepsze komponenty UI, loading states
- **Produkcja** - logging, monitoring, baza danych

Po wprowadzeniu **krytycznych poprawek** projekt będzie gotowy do użycia produkcyjnego dla małych aplikacji. Dla większych zastosowań warto rozważyć:
- Bazę danych zamiast pliku JSON
- Autentykację i autoryzację
- Testy automatyczne
- CI/CD pipeline

---

## ✅ Checklist Wdrożenia do Produkcji

- [ ] Dodać walidację rozmiaru danych
- [ ] Naprawić inline handlers (event delegation)
- [ ] Dodać obsługę uszkodzonego JSON
- [ ] Rozwiązać race condition (lub użyć bazy danych)
- [ ] Dodać rate limiting
- [ ] Dodać logging (winston/morgan)
- [ ] Ograniczyć CORS do konkretnych domen
- [ ] Dodać timeout dla requestów
- [ ] Dodać testy jednostkowe
- [ ] Dodać monitoring
- [ ] Skonfigurować HTTPS
- [ ] Dodać backup automatyczny pliku tasks.json

---

**Autor Code Review:** AI Assistant  
**Data:** 2025-11-22  
**Wersja:** 2.0

