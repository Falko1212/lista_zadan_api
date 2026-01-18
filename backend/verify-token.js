require('dotenv').config();
const { supabase } = require('./config/supabase');

/**
 * Skrypt do weryfikacji struktury tokena JWT
 * Sprawdza czy token zawiera pole user_role
 */

async function verifyToken() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('❌ Użycie: node verify-token.js <email> <hasło>');
        process.exit(1);
    }

    try {
        console.log('🔐 Logowanie...');

        // Zaloguj się
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Błąd logowania:', error.message);
            process.exit(1);
        }

        console.log('✅ Zalogowano pomyślnie!\n');

        // Pobierz token
        const token = data.session.access_token;

        // Zdekoduj payload (środkowa część tokena)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        console.log('📋 Struktura tokena JWT:\n');
        console.log('┌─────────────────┬──────────────────────────────────────────┐');
        console.log('│ Pole            │ Wartość                                  │');
        console.log('├─────────────────┼──────────────────────────────────────────┤');
        console.log(`│ sub             │ ${payload.sub.substring(0, 36).padEnd(40)} │`);
        console.log(`│ email           │ ${payload.email.padEnd(40)} │`);
        console.log(`│ user_role       │ ${(payload.user_role || 'BRAK!').padEnd(40)} │`);
        console.log(`│ aud             │ ${payload.aud.padEnd(40)} │`);
        console.log(`│ role            │ ${payload.role.padEnd(40)} │`);
        console.log(`│ iat             │ ${new Date(payload.iat * 1000).toISOString().padEnd(40)} │`);
        console.log(`│ exp             │ ${new Date(payload.exp * 1000).toISOString().padEnd(40)} │`);
        console.log('└─────────────────┴──────────────────────────────────────────┘\n');

        // Weryfikacja
        if (payload.user_role) {
            console.log('✅ Token zawiera pole user_role:', payload.user_role);
            console.log('✅ Custom Access Token Hook działa poprawnie!');
        } else {
            console.log('❌ UWAGA: Token NIE zawiera pola user_role!');
            console.log('❌ Custom Access Token Hook może nie być włączony.');
            console.log('\nSprawdź:');
            console.log('1. Czy hook jest włączony w: Authentication → Hooks');
            console.log('2. Czy funkcja custom_access_token_hook istnieje');
            console.log('3. Czy użytkownik ma profil w tabeli profiles');
        }

        console.log('\n🔗 Możesz też zweryfikować token na: https://jwt.io');
        console.log('Token (skopiuj poniżej):');
        console.log(token);

    } catch (error) {
        console.error('❌ Błąd:', error.message);
        process.exit(1);
    }
}

verifyToken();
