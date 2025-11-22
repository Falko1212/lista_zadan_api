// Aplikacja ToDo - główny plik JavaScript

// Konfiguracja API - można nadpisać przez window.API_BASE_URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 5000; // 5 sekund

// Stan aplikacji
let tasks = [];
let currentFilter = 'all'; // all, active, done
let isLoading = false;

/**
 * Funkcja pomocnicza do wykonywania requestów z timeout
 * @param {string} url - URL do requestu
 * @param {Object} options - Opcje fetch
 * @param {number} timeout - Timeout w milisekundach
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

/**
 * Funkcja pomocnicza do mapowania pól między API a frontendem
 * @param {Object} task - Zadanie z API
 * @returns {Object} Zadanie z polami zmapowanymi dla frontendu
 */
function mapTaskFromAPI(task) {
    return {
        ...task,
        done: task.completed !== undefined ? task.completed : false
    };
}

/**
 * Funkcja pomocnicza do mapowania pól z frontendu do API
 * @param {Object} task - Zadanie z frontendu
 * @returns {Object} Zadanie z polami zmapowanymi dla API
 */
function mapTaskToAPI(task) {
    return {
        title: task.title,
        description: task.description,
        completed: task.completed !== undefined ? task.completed : task.done || false
    };
}

// Funkcja pomocnicza do obsługi błędów API
function handleApiError(error, message) {
    console.error(message, error);
    const errorMsg = error.message === 'Request timeout' 
        ? 'Przekroczono czas oczekiwania na odpowiedź serwera'
        : `${message}. Sprawdź czy serwer API działa na ${API_BASE_URL}`;
    alert(`Błąd: ${errorMsg}`);
}

/**
 * Ustawia stan ładowania
 * @param {boolean} loading - Czy aplikacja ładuje dane
 */
function setLoadingState(loading) {
    isLoading = loading;
    const taskList = document.getElementById('taskList');
    if (!taskList) return;
    
    if (loading) {
        taskList.innerHTML = '<li class="collection-item"><div class="center-align"><div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Ładowanie zadań...</p></div></li>';
    }
}

// Wczytaj zadania z API
async function loadTasks() {
    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Obsługa pustej odpowiedzi
        const text = await response.text();
        const tasksData = text ? JSON.parse(text) : [];
        
        tasks = Array.isArray(tasksData) 
            ? tasksData.map(mapTaskFromAPI)
            : [];
        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się pobrać zadań z serwera');
        // W razie błędu wyświetl pustą listę
        tasks = [];
        renderTasks();
    } finally {
        setLoadingState(false);
    }
}

// Obsługa dodawania nowego zadania
async function handleAddTask(event) {
    event.preventDefault();
    
    const titleInput = document.getElementById('taskTitle');
    const descriptionInput = document.getElementById('taskDescription');
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    
    // Walidacja przed wysłaniem
    if (title === '') {
        alert('Proszę podać tytuł zadania');
        return;
    }
    
    if (title.length > 200) {
        alert('Tytuł nie może przekraczać 200 znaków');
        return;
    }
    
    if (description.length > 1000) {
        alert('Opis nie może przekraczać 1000 znaków');
        return;
    }
    
    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Nie udało się dodać zadania');
        }

        const newTask = await response.json();
        
        // Mapuj completed na done
        const mappedTask = mapTaskFromAPI(newTask);
        
        // Dodaj zadanie do lokalnej listy
        tasks.push(mappedTask);
        
        // Wyczyść formularz
        titleInput.value = '';
        descriptionInput.value = '';
        M.updateTextFields(); // Aktualizuj Materialize labels
        
        // Przerenderuj zadania
        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się dodać zadania');
    } finally {
        setLoadingState(false);
    }
}

// Usuwanie zadania z listy
async function deleteTask(taskId) {
    if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) {
        return;
    }
    
    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json();
                alert(`Błąd: ${errorData.error}`);
                // Odśwież listę zadań
                loadTasks();
                return;
            }
            throw new Error('Nie udało się usunąć zadania');
        }

        // Usuń z lokalnej listy
        tasks = tasks.filter(task => task.id !== taskId);
        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się usunąć zadania');
        // Odśwież listę zadań w razie błędu
        loadTasks();
    } finally {
        setLoadingState(false);
    }
}

// Przełączanie statusu zadania (zakończone/aktywne)
async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newCompleted = !(task.completed !== undefined ? task.completed : task.done);
    
    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed: newCompleted
            })
        });

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json();
                alert(`Błąd: ${errorData.error}`);
                // Odśwież listę zadań
                loadTasks();
                return;
            }
            throw new Error('Nie udało się zaktualizować zadania');
        }

        const updatedTask = await response.json();
        
        // Zaktualizuj lokalne zadanie
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = mapTaskFromAPI(updatedTask);
        }
        
        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się zaktualizować statusu zadania');
    } finally {
        setLoadingState(false);
    }
}

// Rozpoczęcie edycji zadania
async function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Pobierz nowy tytuł i opis
    const newTitle = prompt('Edytuj tytuł:', task.title);
    if (newTitle === null) return; // Użytkownik anulował
    
    // Walidacja przed wysłaniem
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle === '') {
        alert('Tytuł nie może być pusty');
        return;
    }
    
    if (trimmedTitle.length > 200) {
        alert('Tytuł nie może przekraczać 200 znaków');
        return;
    }
    
    const newDescription = prompt('Edytuj opis:', task.description || '');
    if (newDescription === null) return; // Użytkownik anulował
    
    if (newDescription.length > 1000) {
        alert('Opis nie może przekraczać 1000 znaków');
        return;
    }
    
    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: trimmedTitle,
                description: newDescription.trim()
            })
        });

        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json();
                alert(`Błąd: ${errorData.error}`);
                // Odśwież listę zadań
                loadTasks();
                return;
            }
            throw new Error('Nie udało się zaktualizować zadania');
        }

        const updatedTask = await response.json();
        
        // Zaktualizuj lokalne zadanie
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = mapTaskFromAPI(updatedTask);
        }
        
        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się zaktualizować zadania');
    } finally {
        setLoadingState(false);
    }
}

// Filtrowanie zadań na podstawie aktualnego filtra
function getFilteredTasks() {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(task => {
                const completed = task.completed !== undefined ? task.completed : task.done;
                return !completed;
            });
        case 'done':
            return tasks.filter(task => {
                const completed = task.completed !== undefined ? task.completed : task.done;
                return completed;
            });
        default:
            return tasks; // all
    }
}

// Renderowanie listy zadań
function renderTasks() {
    if (isLoading) return; // Nie renderuj podczas ładowania
    
    const taskList = document.getElementById('taskList');
    if (!taskList) {
        console.error('Element taskList nie został znaleziony');
        return;
    }
    
    taskList.innerHTML = ''; // Wyczyść listę
    
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        const message = tasks.length === 0 
            ? 'Brak zadań' 
            : 'Brak zadań pasujących do filtra';
        taskList.innerHTML = `<li class="collection-item">${message}</li>`;
        return;
    }
    
    // Utwórz elementy dla każdego zadania
    filteredTasks.forEach(task => {
        const listItem = document.createElement('li');
        listItem.className = 'collection-item';
        
        // Użyj completed zamiast done dla spójności z API
        const isCompleted = task.completed !== undefined ? task.completed : task.done;
        
        listItem.innerHTML = `
            <div class="task-item">
                <label>
                    <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                           onchange="toggleTask(${task.id})">
                    <span></span>
                </label>
                <div class="task-content ${isCompleted ? 'task-done' : ''}">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-small waves-effect waves-light" 
                            onclick="editTask(${task.id})">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-small waves-effect waves-light red" 
                            onclick="deleteTask(${task.id})">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            </div>
        `;
        
        taskList.appendChild(listItem);
    });
}

// Funkcja pomocnicza do bezpiecznego wyświetlania HTML (zapobiega XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicjalizacja aplikacji po załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    // Inicjalizacja Materialize (dla formularzy)
    M.AutoInit();
    
    // Wczytaj zadania z API
    loadTasks();
    
    // Obsługa formularza dodawania zadania
    document.getElementById('taskForm').addEventListener('submit', handleAddTask);
    
    // Obsługa filtrów
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Usuń klasę active ze wszystkich przycisków
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Dodaj klasę active do klikniętego przycisku
            this.classList.add('active');
            // Ustaw aktualny filtr
            currentFilter = this.getAttribute('data-filter');
            // Przerenderuj zadania
            renderTasks();
        });
    });
});

// Eksportuj funkcje do globalnego zakresu dla inline handlers
window.toggleTask = toggleTask;
window.editTask = editTask;
window.deleteTask = deleteTask;
