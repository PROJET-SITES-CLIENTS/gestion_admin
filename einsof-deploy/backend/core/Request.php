<?php
namespace App\core;

/**
 * Représentation de la requête HTTP entrante.
 *
 * Durcissements :
 *  - Limite de taille du corps JSON (anti-DoS mémoire).
 *  - Plus de FILTER_SANITIZE_SPECIAL_CHARS (déprécié PHP 8.1) :
 *    l'encodage HTML se fait à l'affichage, le nettoyage métier dans les contrôleurs.
 *  - Propriété $user déclarée (PHP 8.2 : plus de propriétés dynamiques).
 */
class Request {
    /** @var array|null Payload JWT de l'utilisateur authentifié */
    public $user = null;

    private const MAX_BODY_BYTES = 26214400; // 25 Mo (uploads base64 inclus)

    public function getMethod(): string {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    public function getPath(): string {
        $path = $_SERVER['REQUEST_URI'] ?? '/';
        $position = strpos($path, '?');
        if ($position !== false) {
            $path = substr($path, 0, $position);
        }
        return $path;
    }

    public function getBody(): array {
        $body = [];
        $method = $this->getMethod();

        if ($method === 'GET') {
            foreach ($_GET as $key => $value) {
                $body[$key] = is_string($value) ? self::cleanString($value) : $value;
            }
            return $body;
        }

        if (in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
            // Garde-fou taille du corps
            $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
            if ($contentLength > self::MAX_BODY_BYTES) {
                Response::json(['error' => 'Corps de requête trop volumineux.'], 413);
            }

            $raw = file_get_contents('php://input');
            if (strlen((string) $raw) > self::MAX_BODY_BYTES) {
                Response::json(['error' => 'Corps de requête trop volumineux.'], 413);
            }

            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }

            foreach ($_POST as $key => $value) {
                $body[$key] = is_string($value) ? self::cleanString($value) : $value;
            }
        }

        return $body;
    }

    public function getHeader(string $name): ?string {
        $name = strtolower($name);

        $headers = [];
        if (function_exists('getallheaders')) {
            $headers = getallheaders() ?: [];
        } else {
            foreach ($_SERVER as $key => $value) {
                if (substr($key, 0, 5) === 'HTTP_') {
                    $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                    $headers[$headerName] = $value;
                }
            }
        }

        foreach ($headers as $key => $value) {
            if (strtolower($key) === $name) {
                return $value;
            }
        }

        if ($name === 'authorization' && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }
        if ($name === 'authorization' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return null;
    }

    /** Adresse IP cliente (best-effort). */
    public function getClientIp(): string {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /** Nettoyage basique d'une chaîne entrante (contrôles + UTF-8 valide). */
    private static function cleanString(string $value): string {
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
        if (!mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }
        return $value;
    }
}
