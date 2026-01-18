require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

/**
 * Skrypt do nadawania roli administratora użytkownikowi
 */

async function makeAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.error('❌ Użycie: node make-admin.js <email>');
        console.log('Przykład: node make-admin.js user@example.com');
        process.exit(1);
    }

    try {
        console.log(`🔍 Szukam użytkownika: ${email}`);

        // Znajdź użytkownika
        const { data: profile, error: findError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (findError || !profile) {
            console.error(`❌ Nie znaleziono użytkownika: ${email}`);
            process.exit(1);
        }

        console.log(`✅ Znaleziono użytkownika: ${profile.email}`);
        console.log(`   Obecna rola: ${profile.role}`);

        if (profile.role === 'admin') {
            console.log('ℹ️  Użytkownik już jest administratorem!');
            process.exit(0);
        }

        // Zmień rolę na admin
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin' })
            .eq('email', email)
            .select()
            .single();

        if (error) {
            console.error('❌ Błąd podczas zmiany roli:', error.message);
            process.exit(1);
        }

        console.log('\n✅ Pomyślnie nadano rolę administratora!');
        console.log(`   Email: ${data.email}`);
        console.log(`   Nowa rola: ${data.role}`);
        console.log('\n⚠️  WAŻNE: Użytkownik musi się wylogować i zalogować ponownie,');
        console.log('   aby otrzymać nowy token JWT z rolą admin.');

    } catch (error) {
        console.error('❌ Błąd:', error.message);
        process.exit(1);
    }
}

makeAdmin();
