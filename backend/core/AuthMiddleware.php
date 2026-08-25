<?php
namespace App\core;

use App\utils\JwtUtils;

/**
 * Middleware d'authentification / autorisation.
 *
 * Conventions HTTP :
 *  - 401 : non authentifié (token absent, invalide ou expiré)
 *  - 403 : authentifié mais rôle insuffisant
 *
 * NOTE : Response::json() termine le script (exit). Les appels ci-dessous
 * sont donc des gardes fatales : le code qui suit ne s'exécute que si l'accès est autorisé.
 */
class AuthMiddleware {
    /**
     * Authentifie la requête via l'en-tête Authorization: Bearer <jwt>.
     * @return array Payload du token (id, username, role...)
     */
    public static function authenticate(Request $request): array {
        $authHeader = $request->getHeader('Authorization');

        $token = null;
        if ($authHeader && preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if (!$token) {
            Response::json(['error' => 'Authentification requise.'], 401);
        }

        $decoded = JwtUtils::verify($token, Config::getJwtSecret());

        if (!$decoded || empty($decoded['id']) || !isset($decoded['role'])) {
            Response::json(['error' => 'Session invalide ou expirée.'], 401);
        }

        $request->user = $decoded;
        return $decoded;
    }

    /**
     * Authentifie puis vérifie que le rôle fait partie des rôles autorisés.
     * Exemple : AuthMiddleware::authorize($request, 'GERANT', 'COMPTABLE');
     */
    public static function authorize(Request $request, string ...$allowedRoles): array {
        $user = isset($request->user) ? $request->user : self::authenticate($request);

        $role = $user['role'] ?? '';
        if (!in_array($role, $allowedRoles, true)) {
            Response::json(['error' => 'Accès refusé : permissions insuffisantes.'], 403);
        }

        return $user;
    }
}
