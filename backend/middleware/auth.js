const { supabase } = require('../config/supabase');

/**
 * Middleware weryfikujący token JWT i dodający dane użytkownika do req.user
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'No token provided'
            });
        }

        const token = authHeader.substring(7); // Usuń "Bearer "

        // Weryfikacja tokena przez Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }

        // Pobierz profil użytkownika z rolą
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Błąd pobierania profilu:', profileError);
            return res.status(500).json({
                error: 'Failed to fetch user profile'
            });
        }

        // Dodaj dane użytkownika do request
        req.user = {
            id: user.id,
            email: user.email,
            role: profile?.role || 'user'
        };

        next();
    } catch (error) {
        console.error('Błąd weryfikacji tokena:', error);
        return res.status(401).json({
            error: 'Authentication failed'
        });
    }
}

/**
 * Middleware wymagający autoryzacji
 */
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }
    next();
}

/**
 * Middleware wymagający roli administratora
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required'
        });
    }

    next();
}

module.exports = {
    verifyToken,
    requireAuth,
    requireAdmin
};
