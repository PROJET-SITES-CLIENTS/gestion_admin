<?php
namespace App\core;

/**
 * Limiteur de tentatives simple, basé sur un fichier (hébergements mutualisés).
 * Conçu pour l'anti-bruteforce du login : 5 échecs / 15 min par (username + IP).
 */
class RateLimiter {
    private static function storeFile(): string {
        // Répertoire de données du backend, insensible aux requêtes web concurrentes.
        $dir = __DIR__ . '/../data';
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        return $dir . '/rate_limiter.json';
    }

    private static function load(): array {
        $file = self::storeFile();
        if (!file_exists($file)) {
            return [];
        }
        $decoded = json_decode((string) file_get_contents($file), true);
        return is_array($decoded) ? $decoded : [];
    }

    private static function save(array $data): void {
        $file = self::storeFile();
        $fp = fopen($file, 'c+');
        if (!$fp) {
            return;
        }
        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($data));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
    }

    private static function pruneKey(array $entries, int $windowSeconds): array {
        $threshold = time() - $windowSeconds;
        return array_values(array_filter($entries, static fn($t) => is_int($t) && $t > $threshold));
    }

    /** @return bool true si la limite est atteinte (requête à refuser) */
    public static function tooManyAttempts(string $key, int $max = 5, int $windowSeconds = 900): bool {
        $all = self::load();
        if (!isset($all[$key]) || !is_array($all[$key])) {
            return false;
        }
        $recent = self::pruneKey($all[$key], $windowSeconds);
        return count($recent) >= $max;
    }

    public static function hit(string $key): void {
        $all = self::load();
        $entries = isset($all[$key]) && is_array($all[$key]) ? $all[$key] : [];
        $entries[] = time();
        // Purge globale : évite la croissance infinie du fichier.
        foreach ($all as $k => $v) {
            $all[$k] = is_array($v) ? self::pruneKey($v, 3600) : [];
            if (empty($all[$k])) {
                unset($all[$k]);
            }
        }
        $all[$key] = $entries;
        self::save($all);
    }

    public static function clear(string $key): void {
        $all = self::load();
        if (isset($all[$key])) {
            unset($all[$key]);
            self::save($all);
        }
    }
}
