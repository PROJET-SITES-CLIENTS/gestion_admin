<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Config;
use App\core\RateLimiter;
use App\core\Sanitizer;
use App\utils\JwtUtils;

/**
 * Authentification et gestion des comptes.
 *
 * Sécurité :
 *  - Aucune fuite d'information dans les réponses (pas de debug_*, message unique au login).
 *  - Mots de passe stockés UNIQUEMENT en hash bcrypt (plus de plain_password).
 *  - Rate limiting : 5 échecs / 15 min par (username + IP).
 *  - Rôles validés par liste blanche ; politique de mot de passe (>= 8).
 */
class AuthController {
    /** Rôles applicatifs valides (alignés sur src/types.ts). */
    public const VALID_ROLES = [
        'GERANT', 'COMMERCIAL', 'COMPTABLE', 'RH', 'ASSISTANTE',
        'ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP',
        'RESP_MATERIEL', 'MAGASINIER_BTP',
        'RESP_PRODUCTION', 'RESP_QUALITE', 'RESP_AGRO', 'RESP_STOCKAGE', 'RESP_TRACABILITE',
        'DEVELOPPEUR',
    ];

    public function login(Request $request) {
        $body = $request->getBody();
        $username = isset($body['username']) ? strtolower(trim((string) $body['username'])) : '';
        $password = (string) ($body['password'] ?? '');

        $throttleKey = $username . '|' . $request->getClientIp();
        if (RateLimiter::tooManyAttempts($throttleKey)) {
            Response::json([
                'success' => false,
                'error' => 'Trop de tentatives. Réessayez dans 15 minutes.'
            ], 429);
        }

        $db = Database::getInstance();
        $users = $db->getTable('users');

        $user = null;
        foreach ($users as $u) {
            if (strtolower(trim((string) ($u['username'] ?? ''))) === $username) {
                $user = $u;
                break;
            }
        }

        // Message volontairement IDENTIQUE pour "utilisateur inconnu" et
        // "mot de passe erroné" (anti-énumération de comptes).
        $genericError = ['success' => false, 'error' => 'Identifiants invalides.'];

        if (!$user) {
            RateLimiter::hit($throttleKey);
            Response::json($genericError, 401);
        }

        $hash = $user['password_hash'] ?? $user['passwordHash'] ?? '';
        if ($hash === '' || !password_verify($password, $hash)) {
            RateLimiter::hit($throttleKey);
            Response::json($genericError, 401);
        }

        if (isset($user['isActive']) && $user['isActive'] === false) {
            Response::json(['success' => false, 'error' => 'Ce compte est désactivé.'], 403);
        }

        RateLimiter::clear($throttleKey);

        $token = JwtUtils::generate([
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ], Config::getJwtSecret(), Config::getJwtTtlSeconds());

        Response::json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'firstName' => $user['first_name'] ?? $user['firstName'] ?? '',
                'lastName' => $user['last_name'] ?? $user['lastName'] ?? ''
            ]
        ]);
    }

    public function register(Request $request) {
        AuthMiddleware::authorize($request, 'GERANT');

        $body = $request->getBody();
        $username = strtolower(trim((string) ($body['username'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $role = (string) ($body['role'] ?? '');
        $firstName = Sanitizer::text($body['firstName'] ?? '', 100);
        $lastName = Sanitizer::text($body['lastName'] ?? '', 100);

        if (!preg_match('/^[a-z0-9_.\-]{3,30}$/', $username)) {
            Response::json([
                'success' => false,
                'error' => "Identifiant invalide (3 à 30 caractères : lettres minuscules, chiffres, . _ -)."
            ], 400);
        }

        if (strlen($password) < 8) {
            Response::json([
                'success' => false,
                'error' => 'Le mot de passe doit contenir au moins 8 caractères.'
            ], 400);
        }

        $role = Sanitizer::pick($role, self::VALID_ROLES);
        if ($role === null) {
            Response::json(['success' => false, 'error' => 'Rôle invalide.'], 400);
        }

        $db = Database::getInstance();
        $users = $db->getTable('users');

        foreach ($users as $u) {
            if (strtolower(trim((string) ($u['username'] ?? ''))) === $username) {
                Response::json(['success' => false, 'error' => 'Cet identifiant est déjà utilisé.'], 409);
            }
        }

        $id = Database::generateId();
        $newUser = [
            'id' => $id,
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'role' => $role,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'isActive' => true,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $db->insertTableItem('users', $newUser);

        Response::json([
            'success' => true,
            'user' => [
                'id' => $id,
                'username' => $username,
                'role' => $role
            ]
        ], 201);
    }

    public function getUsers(Request $request) {
        AuthMiddleware::authorize($request, 'GERANT');
        $db = Database::getInstance();
        $users = $db->getTable('users');

        // Jamais de hash ni de mot de passe en clair dans la réponse.
        $safeUsers = array_map(static function ($u) {
            return [
                'id' => $u['id'] ?? '',
                'username' => $u['username'] ?? '',
                'role' => $u['role'] ?? '',
                'firstName' => $u['first_name'] ?? $u['firstName'] ?? '',
                'lastName' => $u['last_name'] ?? $u['lastName'] ?? '',
                'avatarUrl' => $u['avatarUrl'] ?? '',
                'isActive' => !($u['isActive'] === false),
                'createdAt' => $u['created_at'] ?? $u['createdAt'] ?? ''
            ];
        }, $users);

        Response::json(['success' => true, 'users' => array_values($safeUsers)]);
    }

    public function deleteUser(Request $request, $id) {
        $admin = AuthMiddleware::authorize($request, 'GERANT');

        $db = Database::getInstance();
        $users = $db->getTable('users');

        $userToDelete = null;
        $activeGerants = 0;
        foreach ($users as $u) {
            if (($u['id'] ?? null) === $id) {
                $userToDelete = $u;
            }
            if (($u['role'] ?? '') === 'GERANT' && !($u['isActive'] ?? true) === false) {
                $activeGerants++;
            }
        }

        if (!$userToDelete) {
            Response::json(['success' => false, 'error' => 'Utilisateur non trouvé.'], 404);
        }

        if (($userToDelete['id'] ?? '') === ($admin['id'] ?? '')) {
            Response::json(['success' => false, 'error' => 'Vous ne pouvez pas supprimer votre propre compte.'], 400);
        }

        if (($userToDelete['username'] ?? '') === 'admin') {
            Response::json(['success' => false, 'error' => 'Impossible de supprimer le compte administrateur principal.'], 403);
        }

        if (($userToDelete['role'] ?? '') === 'GERANT' && $activeGerants <= 1) {
            Response::json(['success' => false, 'error' => 'Impossible de supprimer le dernier compte Gérant actif.'], 403);
        }

        $db->deleteTableItem('users', 'id', $id);

        Response::json(['success' => true]);
    }
}
