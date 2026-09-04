<?php
namespace App\core;

/**
 * Chargement et accès à la configuration environnementale (.env).
 *
 * Sécurité :
 *  - Le secret JWT vient EXCLUSIVEMENT du fichier .env (jamais de la base de données).
 *  - En cas d'absence / secret trop court / placeholder => échec immédiat (fail-fast)
 *    plutôt qu'un fallback silencieux qui affaiblirait la signature des tokens.
 */
class Config {
    private static $env = [];

    /** Placeholders connus qui ne doivent JAMAIS être acceptés comme secret de production. */
    private const PLACEHOLDER_SECRETS = [
        'default_super_secret_key_change_me_in_prod',
        'votre_super_cle_secrete_en_production',
        'change_me',
        'changeme',
    ];

    public static function load(string $path): void {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }

            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $value = trim($parts[1]);
                // Supprime les guillemets englobants éventuels
                $value = trim($value, "\"'");
                self::$env[$key] = $value;
                $_ENV[$key] = $value;
            }
        }
    }

    /**
     * Lit une variable d'environnement.
     * On se limite à self::$env et $_ENV (pas de getenv()) pour éviter les
     * faux positifs liés à des variables serveur homonymes.
     */
    public static function get(string $key, $default = null) {
        return self::$env[$key] ?? $_ENV[$key] ?? $default;
    }

    /**
     * Secret de signature des JWT. Fail-fast si invalide.
     * Générer un secret : php -r "echo bin2hex(random_bytes(32));"
     */
    public static function getJwtSecret(): string {
        $secret = self::get('JWT_SECRET');
        if (!is_string($secret) || $secret === ''
            || in_array($secret, self::PLACEHOLDER_SECRETS, true)
            || strlen($secret) < 32
        ) {
            http_response_code(500);
            error_log('[Config] JWT_SECRET manquant, trop court (<32) ou placeholder. Voir backend/.env.example');
            echo json_encode(['error' => 'Erreur de configuration du serveur.']);
            exit;
        }
        return $secret;
    }

    /** Durée de vie des tokens (heures). Défaut : 12h. */
    public static function getJwtTtlSeconds(): int {
        $hours = (int) self::get('JWT_TTL_HOURS', '12');
        return ($hours > 0 ? $hours : 12) * 3600;
    }

    /** Taille maximale d'un upload (octets). Défaut : 10 Mo. */
    public static function getMaxUploadBytes(): int {
        $mb = (int) self::get('MAX_UPLOAD_MB', '10');
        return ($mb > 0 ? $mb : 10) * 1024 * 1024;
    }

    /**
     * Origines CORS autorisées (CSV dans .env : CORS_ALLOWED_ORIGINS).
     * Liste vide (défaut) = same-origin uniquement : aucun en-tête ACAO n'est émis.
     */
    public static function getAllowedOrigins(): array {
        $raw = self::get('CORS_ALLOWED_ORIGINS', '');
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }
}
