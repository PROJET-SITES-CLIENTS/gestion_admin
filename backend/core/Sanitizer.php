<?php
namespace App\core;

/**
 * Helpers de validation / nettoyage des entrées.
 * Règle du projet : les chaînes destinées à être réaffichées sont nettoyées
 * à l'écriture (anti-XSS stocké), les énumérations passent par pick().
 */
class Sanitizer {
    /** Nettoie une chaîne (anti-XSS) et borne sa longueur. */
    public static function text($value, int $maxLength = 2000): string {
        if (!is_string($value)) {
            return '';
        }
        $value = strip_tags($value);
        $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        if (mb_strlen($value) > $maxLength) {
            $value = mb_substr($value, 0, $maxLength);
        }
        return $value;
    }

    /** Nettoie un texte multiligne (conserve les retours à la ligne). */
    public static function multiline($value, int $maxLength = 20000): string {
        if (!is_string($value)) {
            return '';
        }
        $value = strip_tags($value, '<br>');
        $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        if (mb_strlen($value) > $maxLength) {
            $value = mb_substr($value, 0, $maxLength);
        }
        return $value;
    }

    public static function int($value, int $default = 0): int {
        return is_numeric($value) ? (int) $value : $default;
    }

    public static function float($value, float $default = 0.0): float {
        return is_numeric($value) ? (float) $value : $default;
    }

    public static function bool($value, bool $default = false): bool {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
        }
        if (is_int($value)) {
            return $value === 1;
        }
        return $default;
    }

    /**
     * Valide une valeur contre une liste blanche d'énumérations.
     * @return string|null La valeur si autorisée, sinon null.
     */
    public static function pick($value, array $allowed): ?string {
        if (is_string($value) && in_array($value, $allowed, true)) {
            return $value;
        }
        return null;
    }

    /** Valide une date "YYYY-MM-DD" (ou datetime ISO), sinon null. */
    public static function date($value): ?string {
        if (!is_string($value) || $value === '') {
            return null;
        }
        $d = \DateTime::createFromFormat('Y-m-d', substr($value, 0, 10));
        return $d && $d->format('Y-m-d') === substr($value, 0, 10) ? $value : null;
    }

    /**
     * Nettoie récursivement les valeurs scalaires d'une structure
     * (utilisé pour les documents, plans de paiement, etc.).
     */
    public static function deepText($value, int $maxLength = 2000) {
        if (is_string($value)) {
            return self::text($value, $maxLength);
        }
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $out[self::text((string) $k, 200)] = self::deepText($v, $maxLength);
            }
            return $out;
        }
        if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
            return $value;
        }
        return null;
    }
}
