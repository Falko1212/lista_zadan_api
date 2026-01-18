require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase, supabaseAdmin } = require('./config/supabase');
const { verifyToken, requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// ENDPOINTY PUBLICZNE (bez autoryzacji)
// ============================================================================

/**
 * GET /health - Sprawdzenie statusu API
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /auth/register - Rejestracja nowego użytkownika
 */
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Walidacja
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        // Rejestracja przez Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            // Sprawdź czy użytkownik już istnieje
            if (error.message.includes('already registered')) {
                return res.status(400).json({
                    error: 'User already exists'
                });
            }

            console.error('Błąd rejestracji:', error);
            return res.status(400).json({
                error: error.message
            });
        }

        // Pobierz profil użytkownika (utworzony automatycznie przez trigger)
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        res.status(201).json({
            message: 'User created',
            user: {
                id: data.user.id,
                email: data.user.email,
                role: profile?.role || 'user',
                created_at: data.user.created_at
            }
        });
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się zarejestrować użytkownika'
        });
    }
});

/**
 * POST /auth/login - Logowanie użytkownika
 */
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Walidacja
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Logowanie przez Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Pobierz profil użytkownika z rolą
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        res.json({
            token: data.session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                role: profile?.role || 'user'
            }
        });
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się zalogować'
        });
    }
});

// ============================================================================
// MIDDLEWARE AUTORYZACJI - wszystkie endpointy poniżej wymagają tokena
// ============================================================================
app.use(verifyToken);

// ============================================================================
// ENDPOINTY TASKÓW (wymagają autoryzacji)
// ============================================================================

/**
 * GET /tasks - Pobranie listy tasków
 * User widzi tylko swoje taski, admin widzi wszystkie
 */
app.get('/tasks', requireAuth, async (req, res) => {
    try {
        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        // Jeśli nie jest adminem, pokaż tylko jego taski
        // (RLS automatycznie to filtruje, ale dla jasności dodajemy warunek)
        if (req.user.role !== 'admin') {
            query = query.eq('user_id', req.user.id);
        }

        const { data: tasks, error } = await query;

        if (error) {
            console.error('Błąd pobierania tasków:', error);
            return res.status(500).json({
                error: 'Failed to fetch tasks'
            });
        }

        res.json(tasks || []);
    } catch (error) {
        console.error('Błąd podczas pobierania tasków:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się pobrać tasków'
        });
    }
});

/**
 * POST /tasks - Utworzenie nowego taska
 */
app.post('/tasks', requireAuth, async (req, res) => {
    try {
        const { title } = req.body;

        // Walidacja
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({
                error: 'Title is required'
            });
        }

        // Utworzenie taska (automatycznie przypisany do zalogowanego użytkownika)
        const { data: task, error } = await supabase
            .from('tasks')
            .insert([
                {
                    title: title.trim(),
                    completed: false,
                    user_id: req.user.id
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Błąd tworzenia taska:', error);
            return res.status(500).json({
                error: 'Failed to create task'
            });
        }

        res.status(201).json(task);
    } catch (error) {
        console.error('Błąd podczas tworzenia taska:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się utworzyć taska'
        });
    }
});

/**
 * PATCH /tasks/:id - Aktualizacja taska (zmiana statusu completed)
 */
app.patch('/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        // Walidacja UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                error: 'Invalid task ID format'
            });
        }

        // Walidacja completed
        if (completed !== undefined && typeof completed !== 'boolean') {
            return res.status(400).json({
                error: 'Completed must be a boolean'
            });
        }

        // Sprawdź czy task istnieje i czy użytkownik ma do niego dostęp
        const { data: existingTask, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingTask) {
            return res.status(404).json({
                error: 'Task not found'
            });
        }

        // Sprawdź uprawnienia (user może edytować tylko swoje, admin wszystkie)
        if (req.user.role !== 'admin' && existingTask.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Aktualizacja
        const { data: updatedTask, error: updateError } = await supabase
            .from('tasks')
            .update({ completed })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Błąd aktualizacji taska:', updateError);
            return res.status(500).json({
                error: 'Failed to update task'
            });
        }

        res.json(updatedTask);
    } catch (error) {
        console.error('Błąd podczas aktualizacji taska:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się zaktualizować taska'
        });
    }
});

/**
 * DELETE /tasks/:id - Usunięcie taska
 */
app.delete('/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Walidacja UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                error: 'Invalid task ID format'
            });
        }

        // Sprawdź czy task istnieje i czy użytkownik ma do niego dostęp
        const { data: existingTask, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingTask) {
            return res.status(404).json({
                error: 'Task not found'
            });
        }

        // Sprawdź uprawnienia
        if (req.user.role !== 'admin' && existingTask.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Usunięcie
        const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Błąd usuwania taska:', deleteError);
            return res.status(500).json({
                error: 'Failed to delete task'
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Błąd podczas usuwania taska:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się usunąć taska'
        });
    }
});

// ============================================================================
// ENDPOINTY ADMINISTRACYJNE (tylko dla adminów)
// ============================================================================

/**
 * GET /admin/users - Pobranie listy wszystkich użytkowników
 */
app.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        // Użyj supabaseAdmin aby pominąć RLS
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Błąd pobierania użytkowników:', error);
            return res.status(500).json({
                error: 'Failed to fetch users'
            });
        }

        res.json(profiles || []);
    } catch (error) {
        console.error('Błąd podczas pobierania użytkowników:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się pobrać użytkowników'
        });
    }
});

/**
 * DELETE /admin/users/:id - Usunięcie użytkownika
 */
app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Walidacja UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                error: 'Invalid user ID format'
            });
        }

        // Sprawdź czy użytkownik istnieje
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !profile) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Usuń użytkownika z auth.users (CASCADE usunie też profil i taski)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (deleteError) {
            console.error('Błąd usuwania użytkownika:', deleteError);
            return res.status(500).json({
                error: 'Failed to delete user'
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Błąd podczas usuwania użytkownika:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Nie udało się usunąć użytkownika'
        });
    }
});

// ============================================================================
// OBSŁUGA BŁĘDÓW 404
// ============================================================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} nie istnieje`
    });
});

// ============================================================================
// URUCHOMIENIE SERWERA
// ============================================================================
app.listen(PORT, () => {
    console.log(`🚀 Serwer API działa na http://localhost:${PORT}`);
    console.log(`📊 Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`🔐 Autoryzacja: JWT (Supabase Auth)`);
});
