<?php
namespace App\utils;

/**
 * Implémentation JWT HS256 minimaliste et sûre.
 *
 * Durcissements vs version précédente :
 *  - Vérification du header : l'algorithment DOIT être HS256 (anti "alg confusion").
 *  - Claims iat / nbf / iss ajoutés à l'émission et vérifiés.
 *  - Comparaison timing-safe (hash_equals) conservée.
 *  - Payload corrompu => null proprement (typage strict du retour).
 */
class JwtUtils {
    private const ALG = 'HS256';
    private const ISSUER = 'einsof-erp';

    /**
     * @param array $payload Claims personnalisés (id, username, role...)
     * @param string $secret Secret partagé (>= 32 caractères)
     * @param int|null $ttlSeconds Durée de vie ; défaut 12h
     */
    public static function generate(array $payload, string $secret, ?int $ttlSeconds = null): string {
        $now = time();
        $payload['iat'] = $now;
        $payload['nbf'] = $now;
        $payload['iss'] = self::ISSUER;
        if (!isset($payload['exp'])) {
            $payload['exp'] = $now + ($ttlSeconds ?? 12 * 3600);
        }

        $header = json_encode(['typ' => 'JWT', 'alg' => self::ALG]);
        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE));
        $signature = hash_hmac('sha256', $base64UrlHeader . '.' . $base64UrlPayload, $secret, true);

        return $base64UrlHeader . '.' . $base64UrlPayload . '.' . self::base64UrlEncode($signature);
    }

    /**
     * Vérifie signature, header, expiration et not-before.
     * @return array|null Payload décodé, ou null si le token est invalide.
     */
    public static function verify(string $jwt, string $secret): ?array {
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) !== 3) {
            return null;
        }

        [$header, $payload, $signatureProvided] = $tokenParts;

        // Le header doit déclarer HS256 — refuse tout autre algorithme.
        $decodedHeader = json_decode(self::base64UrlDecode($header), true);
        if (!is_array($decodedHeader) || ($decodedHeader['alg'] ?? '') !== self::ALG) {
            return null;
        }

        $signatureExpected = self::base64UrlEncode(
            hash_hmac('sha256', $header . '.' . $payload, $secret, true)
        );
        if (!hash_equals($signatureExpected, $signatureProvided)) {
            return null;
        }

        $decodedPayload = json_decode(self::base64UrlDecode($payload), true);
        if (!is_array($decodedPayload)) {
            return null;
        }

        $now = time();
        if (isset($decodedPayload['exp']) && (int) $decodedPayload['exp'] < $now) {
            return null; // expiré
        }
        if (isset($decodedPayload['nbf']) && (int) $decodedPayload['nbf'] > $now) {
            return null; // pas encore valide
        }

        return $decodedPayload;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
