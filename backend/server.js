const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');

// Stałe walidacji
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;

// Rate limiting - zwiększony limit dla testów
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: process.env.NODE_ENV === 'test' ? 10000 : 100, // Wysoki limit dla testów
    message: {
        error: 'Too many requests',
        message: 'Zbyt wiele requestów z tego adresu IP, spróbuj ponownie za chwilę.'
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // Logging requestów

// Rate limiting - wyłączony w trybie testowym
if (process.env.NODE_ENV !== 'test') {
    app.use('/tasks', limiter); // Rate limiting dla endpointów /tasks
}

/**
 * Sprawdza czy folder data istnieje, jeśli nie - tworzy go
 * @returns {Promise<void>}
 */
async function ensureDataDir() {
    const dataDir = path.dirname(TASKS_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

/**
 * Odczytuje zadania z pliku JSON
 * @returns {Promise<Array>} Tablica zadań
 * @throws {Error} Jeśli wystąpi błąd odczytu pliku
 */
async function readTasks() {
    try {
        await ensureDataDir();

        // Sprawdź czy plik istnieje
        try {
            const data = await fs.readFile(TASKS_FILE, 'utf8');
            if (data.trim() === '') {
                return [];
            }
            
            // Parsuj JSON z obsługą błędów
            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch (parseError) {
                console.error('Błąd parsowania JSON:', parseError);
                // Utwórz backup uszkodzonego pliku
                try {
                    await fs.writeFile(TASKS_FILE + '.backup', data, 'utf8');
                    console.log('Utworzono backup uszkodzonego pliku:', TASKS_FILE + '.backup');
                } catch (backupError) {
                    console.error('Nie udało się utworzyć backupu:', backupError);
                }
                return [];
            }
            
            // Sprawdź czy wynik jest tablicą
            if (!Array.isArray(parsed)) {
                console.error('Plik tasks.json nie zawiera tablicy');
                // Utwórz backup
                try {
                    await fs.writeFile(TASKS_FILE + '.backup', data, 'utf8');
                } catch (backupError) {
                    // Ignoruj błędy backupu
                }
                return [];
            }
            
            return parsed;
        } catch (error) {
            // Jeśli plik nie istnieje, zwróć pustą tablicę
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    } catch (error) {
        console.error('Błąd odczytu pliku:', error);
        throw error;
    }
}

/**
 * Zapisuje zadania do pliku JSON
 * @param {Array} tasks - Tablica zadań do zapisania
 * @returns {Promise<void>}
 * @throws {Error} Jeśli wystąpi błąd zapisu pliku
 */
async function writeTasks(tasks) {
    try {
        await ensureDataDir();
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    } catch (error) {
        console.error('Błąd zapisu pliku:', error);
        throw error;
    }
}

/**
 * Waliduje ID zadania
 * @param {string} idString - ID jako string
 * @returns {number|null} ID jako liczba lub null jeśli nieprawidłowe
 */
function validateTaskId(idString) {
    const id = parseInt(idString, 10);
    if (isNaN(id) || !Number.isInteger(Number(idString)) || id <= 0) {
        return null;
    }
    return id;
}

/**
 * Waliduje dane zadania
 * @param {Object} data - Dane do walidacji
 * @param {boolean} isUpdate - Czy to aktualizacja (tytuł opcjonalny)
 * @returns {Object|null} Obiekt z błędami lub null jeśli OK
 */
function validateTaskData(data, isUpdate = false) {
    const errors = [];
    
    if (!isUpdate && (!data.title || typeof data.title !== 'string' || data.title.trim() === '')) {
        errors.push('Pole "title" jest wymagane i musi być niepustym stringiem');
    }
    
    if (data.title !== undefined) {
        if (typeof data.title !== 'string') {
            errors.push('Pole "title" musi być stringiem');
        } else if (data.title.trim() === '') {
            errors.push('Pole "title" nie może być puste');
        } else if (data.title.length > MAX_TITLE_LENGTH) {
            errors.push(`Tytuł nie może przekraczać ${MAX_TITLE_LENGTH} znaków`);
        }
    }
    
    if (data.description !== undefined) {
        if (data.description !== null && typeof data.description !== 'string') {
            errors.push('Pole "description" musi być stringiem');
        } else if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
            errors.push(`Opis nie może przekraczać ${MAX_DESCRIPTION_LENGTH} znaków`);
        }
    }
    
    if (data.completed !== undefined && typeof data.completed !== 'boolean') {
        errors.push('Pole "completed" musi być wartością boolean');
    }
    
    return errors.length > 0 ? { errors } : null;
}

// GET /health - Sprawdzenie statusu API
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// GET /tasks - Pobranie wszystkich zadań
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await readTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Błąd podczas pobierania zadań:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się pobrać zadań'
        });
    }
});

// POST /tasks - Dodanie nowego zadania
app.post('/tasks', async (req, res) => {
    try {
        const { title, description } = req.body;

        // Walidacja danych
        const validationError = validateTaskData(req.body, false);
        if (validationError) {
            return res.status(400).json({
                error: 'Bad request',
                message: validationError.errors[0],
                errors: validationError.errors
            });
        }

        // Odczytaj istniejące zadania
        const tasks = await readTasks();

        // Znajdź największe ID i dodaj 1
        let maxId = 0;
        if (tasks.length > 0) {
            const ids = tasks.map(task => task.id || 0).filter(id => typeof id === 'number' && id > 0);
            maxId = ids.length > 0 ? Math.max(...ids) : 0;
        }
        const newId = maxId + 1;

        // Utwórz nowe zadanie
        const newTask = {
            id: newId,
            title: typeof title === 'string' ? title.trim() : title,
            description: (description && typeof description === 'string') ? description.trim() : '',
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Dodaj zadanie do listy
        tasks.push(newTask);

        // Zapisz do pliku
        await writeTasks(tasks);

        // Zwróć utworzone zadanie
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Błąd podczas dodawania zadania:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się dodać zadania'
        });
    }
});

// PUT /tasks/:id - Modyfikacja istniejącego zadania
app.put('/tasks/:id', async (req, res) => {
    try {
        const taskId = validateTaskId(req.params.id);
        if (!taskId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'ID musi być dodatnią liczbą całkowitą'
            });
        }

        const { title, description, completed } = req.body;

        // Walidacja danych
        const validationError = validateTaskData(req.body, true);
        if (validationError) {
            return res.status(400).json({
                error: 'Bad request',
                message: validationError.errors[0],
                errors: validationError.errors
            });
        }

        // Odczytaj istniejące zadania
        const tasks = await readTasks();

        // Znajdź zadanie o podanym ID
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({
                error: 'Task not found',
                id: taskId
            });
        }

        // Zaktualizuj zadanie
        const task = tasks[taskIndex];
        
        if (title !== undefined) {
            task.title = typeof title === 'string' ? title.trim() : title;
        }

        if (description !== undefined) {
            task.description = (description && typeof description === 'string') ? description.trim() : '';
        }

        if (completed !== undefined) {
            task.completed = completed;
        }

        // Dodaj updatedAt jeśli nie istnieje lub zaktualizuj
        task.updatedAt = new Date().toISOString();

        // Zapisz do pliku
        await writeTasks(tasks);

        // Zwróć zaktualizowane zadanie
        res.json(task);
    } catch (error) {
        console.error('Błąd podczas modyfikacji zadania:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się zmodyfikować zadania'
        });
    }
});

// DELETE /tasks/:id - Usunięcie zadania
app.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = validateTaskId(req.params.id);
        if (!taskId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'ID musi być dodatnią liczbą całkowitą'
            });
        }

        // Odczytaj istniejące zadania
        const tasks = await readTasks();

        // Znajdź zadanie o podanym ID
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({
                error: 'Task not found',
                id: taskId
            });
        }

        // Usuń zadanie
        tasks.splice(taskIndex, 1);

        // Zapisz do pliku
        await writeTasks(tasks);

        // Zwróć status 204 No Content
        res.status(204).send();
    } catch (error) {
        console.error('Błąd podczas usuwania zadania:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się usunąć zadania'
        });
    }
});

// Obsługa błędów 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} nie istnieje`
    });
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`🚀 Serwer API działa na http://localhost:${PORT}`);
    console.log(`📁 Plik zadań: ${TASKS_FILE}`);
});
