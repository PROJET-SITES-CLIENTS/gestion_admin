<?php
namespace App\core;

/**
 * Routeur minimaliste.
 *
 * Durcissements :
 *  - CORS : plus de wildcard "*". Les origines autorisées proviennent de
 *    CORS_ALLOWED_ORIGINS (backend/.env). Liste vide = same-origin uniquement.
 *  - Erreurs 500 : le message interne n'est JAMAIS renvoyé au client
 *    (fuite de chemins / détails d'implémentation), il est logué côté serveur.
 */
class Router {
    private $routes = [];
    public $request;

    public function __construct() {
        $this->request = new Request();
    }

    public function get($path, $callback) {
        $this->routes['GET'][$path] = $callback;
    }

    public function post($path, $callback) {
        $this->routes['POST'][$path] = $callback;
    }

    public function put($path, $callback) {
        $this->routes['PUT'][$path] = $callback;
    }

    public function delete($path, $callback) {
        $this->routes['DELETE'][$path] = $callback;
    }

    private function applyCors(): void {
        $allowed = Config::getAllowedOrigins();
        if (empty($allowed)) {
            return; // same-origin : aucun en-tête ACAO nécessaire
        }

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
        }
    }

    public function resolve() {
        try {
            $path = $this->request->getPath();
            $method = $this->request->getMethod();

            if ($method === 'OPTIONS') {
                $allowed = Config::getAllowedOrigins();
                $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
                if (!empty($allowed) && $origin !== '' && in_array($origin, $allowed, true)) {
                    header('Access-Control-Allow-Origin: ' . $origin);
                    header('Vary: Origin');
                    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
                    header('Access-Control-Allow-Headers: Content-Type, Authorization');
                    header('Access-Control-Max-Age: 600');
                }
                http_response_code(204);
                exit;
            }

            $this->applyCors();

            $callback = $this->routes[$method][$path] ?? false;

            if ($callback === false) {
                // Routes dynamiques (ex. /api/projects/:id/update)
                foreach ($this->routes[$method] ?? [] as $route => $cb) {
                    $pattern = preg_replace('/:[a-zA-Z0-9_]+/', '([a-zA-Z0-9_\.\-]+)', $route);
                    if (preg_match("#^$pattern$#", $path, $matches)) {
                        array_shift($matches);
                        if (is_array($cb)) {
                            $cb[0] = new $cb[0]();
                        }
                        return call_user_func_array($cb, [$this->request, ...$matches]);
                    }
                }

                Response::json(['error' => 'Not Found'], 404);
            }

            if (is_array($callback)) {
                $callback[0] = new $callback[0]();
            }

            return call_user_func($callback, $this->request);
        } catch (\Throwable $e) {
            // Log serveur complet, réponse client volontairement générique.
            error_log(
                '[Router] ' . $e->getMessage()
                . ' | ' . $e->getFile() . ':' . $e->getLine()
                . ' | URI=' . ($_SERVER['REQUEST_URI'] ?? '?')
            );
            Response::json(['error' => 'Erreur interne du serveur.'], 500);
        }
    }
}
