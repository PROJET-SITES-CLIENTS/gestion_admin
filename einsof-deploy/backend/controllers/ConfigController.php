<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Configuration de l'entreprise.
 *
 * Sécurité : écriture par LISTE BLANCHE uniquement. L'ancienne version
 * faisait un array_merge brut : un payload malveillant pouvait écraser
 * system_jwt_secret (compromission totale de l'authentification).
 */
class ConfigController {

    public function update(Request $request) {
        AuthMiddleware::authorize($request, 'GERANT');
        $body = $request->getBody();

        $newConfig = [];
        Database::getInstance()->transaction(
            static function ($data) use ($body, &$newConfig) {
                $currentConfig = isset($data['config']) && is_array($data['config']) ? $data['config'] : [];

                foreach (DataController::PUBLIC_CONFIG_KEYS as $key) {
                    if (array_key_exists($key, $body)) {
                        $value = $body[$key];
                        // Les structures complexes (delegations, activeModules,
                        // btpPermissions) sont nettoyées récursivement.
                        $currentConfig[$key] = is_array($value)
                            ? Sanitizer::deepText($value, 300)
                            : (is_bool($value) ? $value : Sanitizer::text((string) $value, 100000));
                    }
                }

                $newConfig = $currentConfig;
                $data['config'] = $currentConfig;
                return $data;
            }
        );

        // Réponse filtrée : jamais de secret.
        Response::json(['success' => true, 'config' => DataController::sanitizeConfig($newConfig)]);
    }

    public function getPublic(Request $request) {
        $db = Database::getInstance();
        $cfg = array_merge(
            $db->getTable('companyConfig') ?: [],
            $db->getTable('config') ?: []
        );

        Response::json(DataController::sanitizeConfig($cfg));
    }
}
