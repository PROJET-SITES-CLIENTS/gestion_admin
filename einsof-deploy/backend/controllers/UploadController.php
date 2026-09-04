<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Config;
use App\core\Sanitizer;

/**
 * Upload de fichiers (base64 JSON).
 *
 * Sécurité :
 *  - Authentification OBLIGATOIRE (l'ancienne version autorisait un upload
 *    anonyme avec un simple projectId devinable).
 *  - Limite de taille (MAX_UPLOAD_MB, défaut 10 Mo).
 *  - MIME réel vérifié via finfo + liste blanche ; nom de fichier régénéré
 *    côté serveur (UUID) => aucun path traversal ni exécution de nom client.
 */
class UploadController {

    public function upload(Request $request) {
        AuthMiddleware::authenticate($request);

        $body = $request->getBody();
        $filename = Sanitizer::text($body['filename'] ?? '', 255);
        $base64 = (string) ($body['base64'] ?? '');
        $projectId = Sanitizer::text($body['projectId'] ?? '', 64);

        if ($filename === '' || $base64 === '') {
            Response::json(['error' => 'Données de fichier manquantes.'], 400);
        }

        // Limite de taille (le base64 est ~33% plus volumineux que le binaire)
        $maxBytes = Config::getMaxUploadBytes();
        if (strlen($base64) > $maxBytes * 1.5) {
            Response::json(['error' => 'Fichier trop volumineux (max ' . round($maxBytes / 1048576) . ' Mo).'], 413);
        }

        $base64Data = preg_replace('/^data:([A-Za-z\-+\/]+);base64,/', '', $base64);
        $decodedData = base64_decode((string) $base64Data, true);
        if ($decodedData === false || $decodedData === '') {
            Response::json(['error' => 'Encodage base64 invalide.'], 400);
        }
        if (strlen($decodedData) > $maxBytes) {
            Response::json(['error' => 'Fichier trop volumineux (max ' . round($maxBytes / 1048576) . ' Mo).'], 413);
        }

        if (!class_exists('\finfo')) {
            Response::json(['error' => 'L\'extension PHP fileinfo est requise. Veuillez l\'activer sur votre hébergement.'], 500);
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = (string) $finfo->buffer($decodedData);

        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf',
            'application/msword' => 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            'application/zip' => 'zip',
            'text/plain' => 'txt'
        ];

        if (!array_key_exists($realMime, $allowedMimes)) {
            Response::json(['error' => 'Type de fichier non autorisé ou corrompu (détecté : ' . $realMime . ').'], 400);
        }

        $ext = $allowedMimes[$realMime];
        $fileId = Database::generateId();
        $newFilename = $fileId . '.' . $ext;

        $uploadsDir = self::uploadsDir();
        if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0755, true)) {
            Response::json(['error' => 'Impossible de créer le dossier d\'uploads.'], 500);
        }

        $filePath = $uploadsDir . '/' . $newFilename;
        if (file_put_contents($filePath, $decodedData, LOCK_EX) === false) {
            Response::json(['error' => 'Échec de l\'écriture du fichier.'], 500);
        }

        Response::json([
            'success' => true,
            'fileId' => $fileId,
            'url' => '/uploads/' . $newFilename,
            'name' => $filename,
            'projectId' => $projectId
        ], 201);
    }

    public static function uploadsDir(): string {
        $custom = Config::get('UPLOADS_DIR');
        if (is_string($custom) && $custom !== '' && is_dir(dirname($custom))) {
            return $custom;
        }
        return __DIR__ . '/../../uploads';
    }
}
