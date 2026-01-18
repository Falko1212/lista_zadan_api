// Aplikacja ToDo z autoryzacją JWT - główny plik JavaScript

// Konfiguracja API
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 5000; // 5 sekund
const TOKEN_KEY = 'todo_auth_token';
const USER_KEY = 'todo_user_data';

// Stan aplikacji
let tasks = [];
let currentFilter = 'all'; // all, active, done
let isLoading = false;
let currentUser = null;
let authToken = null;

/**
 * Funkcja pomocnicza do wykonywania requestów z timeout
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
 * Pobierz token z localStorage
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Zapisz token do localStorage
 */
function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    authToken = token;
}

/**
 * Usuń token z localStorage
 */
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    authToken = null;
    currentUser = null;
}

/**
 * Zapisz dane użytkownika
 */
function saveUserData(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    currentUser = user;
}

/**
 * Pobierz dane użytkownika
 */
function getUserData() {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Sprawdź czy użytkownik jest zalogowany
 */
function isAuthenticated() {
    return !!getToken();
}

/**
 * Pokaż/ukryj sekcje w zależności od stanu autoryzacji
 */
function updateUIForAuthState() {
    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const userInfo = document.getElementById('userInfo');

    if (isAuthenticated()) {
        authSection.classList.add('hide');
        appSection.classList.remove('hide');
        userInfo.classList.remove('hide');

        // Wyświetl dane użytkownika
        const user = getUserData();
        if (user) {
            document.getElementById('userEmail').textContent = user.email;
            const roleBadge = document.getElementById('userRole');
            roleBadge.textContent = user.role === 'admin' ? 'Administrator' : 'Użytkownik';
            roleBadge.className = user.role === 'admin' ? 'badge red' : 'badge blue';
        }

        // Wczytaj zadania
        loadTasks();
    } else {
        authSection.classList.remove('hide');
        appSection.classList.add('hide');
        userInfo.classList.add('hide');
    }
}

/**
 * Obsługa rejestracji
 */
async function handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!email || !password) {
        M.toast({ html: 'Wypełnij wszystkie pola', classes: 'red' });
        return;
    }

    if (password.length < 6) {
        M.toast({ html: 'Hasło musi mieć minimum 6 znaków', classes: 'red' });
        return;
    }

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            M.toast({ html: data.error || 'Błąd rejestracji', classes: 'red' });
            return;
        }

        M.toast({ html: 'Rejestracja udana! Możesz się teraz zalogować', classes: 'green' });

        // Wyczyść formularz
        document.getElementById('registerForm').reset();
    } catch (error) {
        console.error('Błąd rejestracji:', error);
        M.toast({ html: 'Nie udało się połączyć z serwerem', classes: 'red' });
    }
}

/**
 * Obsługa logowania
 */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        M.toast({ html: 'Wypełnij wszystkie pola', classes: 'red' });
        return;
    }

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            M.toast({ html: data.error || 'Nieprawidłowe dane logowania', classes: 'red' });
            return;
        }

        // Zapisz token i dane użytkownika
        saveToken(data.token);
        saveUserData(data.user);

        M.toast({ html: 'Zalogowano pomyślnie!', classes: 'green' });

        // Wyczyść formularz
        document.getElementById('loginForm').reset();

        // Zaktualizuj UI
        updateUIForAuthState();
    } catch (error) {
        console.error('Błąd logowania:', error);
        M.toast({ html: 'Nie udało się połączyć z serwerem', classes: 'red' });
    }
}

/**
 * Obsługa wylogowania
 */
function handleLogout() {
    removeToken();
    tasks = [];
    M.toast({ html: 'Wylogowano pomyślnie', classes: 'green' });
    updateUIForAuthState();
}

/**
 * Funkcja pomocnicza do obsługi błędów API
 */
function handleApiError(error, message) {
    console.error(message, error);

    // Jeśli błąd 401, wyloguj użytkownika
    if (error.status === 401) {
        M.toast({ html: 'Sesja wygasła. Zaloguj się ponownie', classes: 'red' });
        handleLogout();
        return;
    }

    const errorMsg = error.message === 'Request timeout'
        ? 'Przekroczono czas oczekiwania na odpowiedź serwera'
        : message;
    M.toast({ html: errorMsg, classes: 'red' });
}

/**
 * Ustawia stan ładowania
 */
function setLoadingState(loading) {
    isLoading = loading;
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    if (loading) {
        taskList.innerHTML = '<li class="collection-item"><div class="center-align"><div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div><p>Ładowanie zadań...</p></div></li>';
    }
}

/**
 * Wczytaj zadania z API
 */
async function loadTasks() {
    const token = getToken();
    if (!token) {
        console.error('Brak tokena autoryzacji');
        return;
    }

    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.status = response.status;
            throw error;
        }

        const tasksData = await response.json();
        tasks = Array.isArray(tasksData) ? tasksData : [];
        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się pobrać zadań z serwera');
        tasks = [];
        renderTasks();
    } finally {
        setLoadingState(false);
    }
}

/**
 * Obsługa dodawania nowego zadania
 */
async function handleAddTask(event) {
    event.preventDefault();

    const token = getToken();
    if (!token) {
        M.toast({ html: 'Musisz być zalogowany', classes: 'red' });
        return;
    }

    const titleInput = document.getElementById('taskTitle');
    const title = titleInput.value.trim();

    if (title === '') {
        M.toast({ html: 'Proszę podać tytuł zadania', classes: 'red' });
        return;
    }

    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.status = response.status;
            throw error;
        }

        const newTask = await response.json();
        tasks.push(newTask);

        // Wyczyść formularz
        titleInput.value = '';
        M.updateTextFields();

        renderTasks();
        M.toast({ html: 'Zadanie dodane!', classes: 'green' });
    } catch (error) {
        handleApiError(error, 'Nie udało się dodać zadania');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Usuwanie zadania
 */
async function deleteTask(taskId) {
    if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) {
        return;
    }

    const token = getToken();
    if (!token) return;

    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.status = response.status;
            throw error;
        }

        tasks = tasks.filter(task => task.id !== taskId);
        renderTasks();
        M.toast({ html: 'Zadanie usunięte', classes: 'green' });
    } catch (error) {
        handleApiError(error, 'Nie udało się usunąć zadania');
        loadTasks();
    } finally {
        setLoadingState(false);
    }
}

/**
 * Przełączanie statusu zadania
 */
async function toggleTask(taskId) {
    const token = getToken();
    if (!token) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;

    setLoadingState(true);
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed: newCompleted })
        });

        if (!response.ok) {
            const error = new Error('HTTP error');
            error.status = response.status;
            throw error;
        }

        const updatedTask = await response.json();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = updatedTask;
        }

        renderTasks();
    } catch (error) {
        handleApiError(error, 'Nie udało się zaktualizować statusu zadania');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Filtrowanie zadań
 */
function getFilteredTasks() {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(task => !task.completed);
        case 'done':
            return tasks.filter(task => task.completed);
        default:
            return tasks;
    }
}

/**
 * Renderowanie listy zadań
 */
function renderTasks() {
    if (isLoading) return;

    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    taskList.innerHTML = '';

    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        const message = tasks.length === 0
            ? 'Brak zadań'
            : 'Brak zadań pasujących do filtra';
        taskList.innerHTML = `<li class="collection-item">${message}</li>`;
        return;
    }

    filteredTasks.forEach(task => {
        const listItem = document.createElement('li');
        listItem.className = 'collection-item';

        listItem.innerHTML = `
            <div class="task-item">
                <label>
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="toggleTask('${task.id}')">
                    <span></span>
                </label>
                <div class="task-content ${task.completed ? 'task-done' : ''}">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                </div>
                <div class="task-actions">
                    <button class="btn-small waves-effect waves-light red" 
                            onclick="deleteTask('${task.id}')">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            </div>
        `;

        taskList.appendChild(listItem);
    });
}

/**
 * Funkcja pomocnicza do bezpiecznego wyświetlania HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Inicjalizacja aplikacji
 */
document.addEventListener('DOMContentLoaded', function () {
    // Inicjalizacja Materialize
    M.AutoInit();

    // Sprawdź czy użytkownik jest zalogowany
    authToken = getToken();
    currentUser = getUserData();

    // Obsługa formularzy
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('taskForm').addEventListener('submit', handleAddTask);

    // Obsługa filtrów
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Zaktualizuj UI w zależności od stanu autoryzacji
    updateUIForAuthState();
});

// Eksportuj funkcje do globalnego zakresu
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
