require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin } = require('./config/supabase');

/**
 * Skrypt migracji danych z tasks.json do Supabase
 * 
 * UWAGA: Wszystkie zmigrowane taski będą przypisane do użytkownika,
 * którego email podasz jako argument.
 */

const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');

async function migrate() {
    try {
        // Pobierz email użytkownika z argumentów
        const userEmail = process.argv[2];

        if (!userEmail) {
            console.error('❌ Błąd: Musisz podać email użytkownika jako argument');
            console.log('Użycie: node migrate.js <email-użytkownika>');
            console.log('Przykład: node migrate.js testuser@gmail.com');
            process.exit(1);
        }

        console.log(`📧 Szukam użytkownika: ${userEmail}`);

        // Znajdź użytkownika w bazie
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role')
            .eq('email', userEmail)
            .single();

        if (profileError || !profile) {
            console.error(`❌ Nie znaleziono użytkownika: ${userEmail}`);
            console.log('Upewnij się, że użytkownik jest zarejestrowany w systemie.');
            process.exit(1);
        }

        console.log(`✅ Znaleziono użytkownika: ${profile.email} (${profile.role})`);
        console.log(`🆔 User ID: ${profile.id}`);

        // Wczytaj dane z tasks.json
        console.log(`\n📂 Wczytywanie danych z ${TASKS_FILE}...`);

        const fileContent = await fs.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(fileContent);

        if (!Array.isArray(tasks) || tasks.length === 0) {
            console.log('⚠️  Plik tasks.json jest pusty lub nie zawiera zadań.');
            process.exit(0);
        }

        console.log(`📊 Znaleziono ${tasks.length} zadań do migracji`);

        // Przekształć zadania do formatu Supabase
        const tasksToMigrate = tasks.map(task => ({
            title: task.title,
            completed: task.completed || false,
            user_id: profile.id,
            created_at: task.createdAt || new Date().toISOString()
        }));

        console.log(`\n🚀 Rozpoczynam migrację...`);

        // Wstaw zadania do Supabase (w partiach po 100)
        const BATCH_SIZE = 100;
        let migratedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < tasksToMigrate.length; i += BATCH_SIZE) {
            const batch = tasksToMigrate.slice(i, i + BATCH_SIZE);

            const { data, error } = await supabaseAdmin
                .from('tasks')
                .insert(batch)
                .select();

            if (error) {
                console.error(`❌ Błąd podczas migracji partii ${i / BATCH_SIZE + 1}:`, error.message);
                errorCount += batch.length;
            } else {
                migratedCount += data.length;
                console.log(`✅ Zmigrowano partię ${i / BATCH_SIZE + 1}: ${data.length} zadań`);
            }
        }

        console.log(`\n📈 Podsumowanie migracji:`);
        console.log(`   ✅ Pomyślnie zmigrowano: ${migratedCount} zadań`);
        if (errorCount > 0) {
            console.log(`   ❌ Błędy: ${errorCount} zadań`);
        }

        // Opcjonalnie: utwórz backup pliku JSON
        const backupFile = TASKS_FILE + '.backup-' + Date.now();
        await fs.copyFile(TASKS_FILE, backupFile);
        console.log(`\n💾 Utworzono backup: ${backupFile}`);

        console.log(`\n✨ Migracja zakończona!`);
        console.log(`\nMożesz teraz sprawdzić zadania w aplikacji, logując się jako: ${userEmail}`);

    } catch (error) {
        console.error('❌ Błąd podczas migracji:', error);
        process.exit(1);
    }
}

// Uruchom migrację
migrate();
