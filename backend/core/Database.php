<?php
namespace App\core;

/**
 * Base de données JSON (db.json) avec verrouillage flock.
 *
 * Sécurité :
 *  - Le compte admin initial n'est créé qu'à la création du fichier db.json,
 *    avec le mot de passe ADMIN_PASSWORD du .env (jamais codé en dur).
 *  - Aucune recréation silencieuse d'un compte par défaut si la table users
 *    se vide (verrou côté AuthController : impossible de supprimer le dernier GERANT).
 */
class Database {
    private static $instance = null;
    private $dbPath;
    private $data = null;

    private function __construct() {
        // db.json à la racine du projet (hors backend/public lorsque le
        // docroot est correctement configuré).
        $this->dbPath = self::defaultDbPath();
        if (!file_exists($this->dbPath)) {
            $initialData = [
                'users' => [
                    [
                        'id' => bin2hex(random_bytes(16)),
                        'username' => 'admin',
                        'password_hash' => password_hash(self::bootstrapAdminPassword(), PASSWORD_BCRYPT),
                        'role' => 'GERANT',
                        'first_name' => 'Admin',
                        'last_name' => 'System',
                        'created_at' => date('Y-m-d H:i:s')
                    ]
                ],
                'projects' => [],
                'prospects' => [],
                'expenses' => [],
                'config' => []
            ];
            file_put_contents(
                $this->dbPath,
                json_encode($initialData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
                LOCK_EX
            );
        }
    }

    public static function defaultDbPath(): string {
        // Autorise la surconfiguration via .env (ex: hébergement où db.json
        // doit vivre hors du docroot).
        $custom = Config::get('DB_FILE');
        if (is_string($custom) && $custom !== '' && is_dir(dirname($custom))) {
            return $custom;
        }
        return __DIR__ . '/../../db.json';
    }

    private static function bootstrapAdminPassword(): string {
        $password = Config::get('ADMIN_PASSWORD');
        if (!is_string($password) || strlen($password) < 8) {
            // Mot de passe aléatoire jetable : le fichier est logué pour
            // permettre une première connexion, puis à changer immédiatement.
            $random = 'Admin-' . bin2hex(random_bytes(6));
            error_log('[Database] Compte admin initial créé avec le mot de passe : ' . $random);
            return $random;
        }
        return $password;
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    /** Identifiant aléatoire hexadécimal (32 caractères). */
    public static function generateId(): string {
        return bin2hex(random_bytes(16));
    }

    public function getData(): array {
        if ($this->data === null) {
            $fp = fopen($this->dbPath, 'r');
            if ($fp) {
                if (flock($fp, LOCK_SH)) {
                    $json = stream_get_contents($fp);
                    flock($fp, LOCK_UN);
                } else {
                    $json = file_get_contents($this->dbPath);
                }
                fclose($fp);
            } else {
                $json = file_get_contents($this->dbPath);
            }

            $decoded = json_decode((string) $json, true);
            if ($decoded === null && trim((string) $json) !== '') {
                throw new \Exception('FATAL: db.json est corrompu. Lecture annulée pour éviter toute perte de données.');
            }
            $this->data = is_array($decoded) ? $decoded : [];
        }
        return $this->data;
    }

    public function saveData($data): void {
        $this->data = $data;
        $fp = fopen($this->dbPath, 'c+');
        if ($fp) {
            if (flock($fp, LOCK_EX)) {
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fp);
                flock($fp, LOCK_UN);
            }
            fclose($fp);
        }
    }

    public function getTable($table): array {
        $data = $this->getData();
        return isset($data[$table]) && is_array($data[$table]) ? $data[$table] : [];
    }

    public function saveTable($table, $tableData): void {
        $fp = fopen($this->dbPath, 'c+');
        if ($fp) {
            if (flock($fp, LOCK_EX)) {
                rewind($fp);
                $json = stream_get_contents($fp);
                $data = json_decode($json, true);
                if ($data === null && trim((string) $json) !== '') {
                    flock($fp, LOCK_UN);
                    fclose($fp);
                    throw new \Exception('FATAL: db.json est corrompu. Écriture annulée pour éviter toute perte de données.');
                }
                if (!is_array($data)) {
                    $data = [];
                }

                $data[$table] = $tableData;
                $this->data = $data;

                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fp);
                flock($fp, LOCK_UN);
            }
            fclose($fp);
        }
    }

    public function transaction(callable $callback): void {
        $fp = fopen($this->dbPath, 'c+');
        if (!$fp) {
            throw new \Exception('Impossible d\'ouvrir db.json en écriture.');
        }
        if (flock($fp, LOCK_EX)) {
            rewind($fp);
            $json = stream_get_contents($fp);
            $data = json_decode($json, true);
            if ($data === null && trim((string) $json) !== '') {
                flock($fp, LOCK_UN);
                fclose($fp);
                throw new \Exception('FATAL: db.json est corrompu. Transaction annulée pour éviter toute perte de données.');
            }
            if (!is_array($data)) {
                $data = [];
            }

            $data = $callback($data);

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fp);
            flock($fp, LOCK_UN);

            $this->data = $data;
        }
        fclose($fp);
    }

    public function insertTableItem($table, $newItem) {
        $this->transaction(static function ($data) use ($table, $newItem) {
            if (!isset($data[$table]) || !is_array($data[$table])) {
                $data[$table] = [];
            }
            $data[$table][] = $newItem;
            return $data;
        });
        return $newItem;
    }

    public function updateTableItem($table, $idKey, $idValue, callable $callback) {
        $updatedItem = null;
        $this->transaction(static function ($data) use ($table, $idKey, $idValue, $callback, &$updatedItem) {
            if (!isset($data[$table]) || !is_array($data[$table])) {
                $data[$table] = [];
            }
            foreach ($data[$table] as &$item) {
                if (($item[$idKey] ?? null) === $idValue) {
                    $item = $callback($item);
                    $updatedItem = $item;
                    break;
                }
            }
            return $data;
        });
        return $updatedItem;
    }

    public function deleteTableItem($table, $idKey, $idValue): bool {
        $deleted = false;
        $this->transaction(static function ($data) use ($table, $idKey, $idValue, &$deleted) {
            if (!isset($data[$table]) || !is_array($data[$table])) {
                return $data;
            }
            foreach ($data[$table] as $key => $item) {
                if (($item[$idKey] ?? null) === $idValue) {
                    array_splice($data[$table], $key, 1);
                    $deleted = true;
                    break;
                }
            }
            return $data;
        });
        return $deleted;
    }
}
