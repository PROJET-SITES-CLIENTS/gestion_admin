<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Prospection CRM.
 * Durcissement : énumérations validées (stage, qualification), nettoyage
 * récursif des structures (interactions, meetings, history), champs
 * lossReason/documents ajoutés à la liste blanche.
 */
class ProspectController {

    private const STAGES = ['NOUVEAU', 'CONTACTE', 'RDV_FIXE', 'PROPOSITION', 'NEGOCIATION', 'GAGNE', 'PERDU'];
    private const QUALIFICATIONS = ['CHAUD', 'TIEDE', 'FROID', 'NON_QUALIFIE'];

    public function create(Request $request) {
        AuthMiddleware::authorize($request, 'GERANT', 'COMMERCIAL');
        $body = $request->getBody();

        $name = Sanitizer::text($body['name'] ?? '', 200);
        $phone = Sanitizer::text($body['phone'] ?? '', 40);
        if ($name === '' || $phone === '') {
            Response::json(['error' => 'Nom et téléphone obligatoires.'], 400);
        }

        $safeBody = self::extract($body);
        $safeBody['id'] = Database::generateId();
        $safeBody['createdAt'] = date('c');
        $safeBody['updatedAt'] = date('c');

        Database::getInstance()->insertTableItem('prospects', $safeBody);
        Response::json($safeBody, 201);
    }

    public function update(Request $request, $id) {
        AuthMiddleware::authorize($request, 'GERANT', 'COMMERCIAL');
        $body = $request->getBody();

        $safeBody = self::extract($body);

        $updatedData = Database::getInstance()->updateTableItem('prospects', 'id', $id,
            static function ($currentData) use ($safeBody, $id) {
                $newData = array_merge($currentData, $safeBody);
                $newData['id'] = $id; // jamais écrasable
                $newData['updatedAt'] = date('c');
                return $newData;
            }
        );

        if (!$updatedData) {
            Response::json(['error' => 'Prospect non trouvé.'], 404);
        }
        Response::json($updatedData);
    }

    public function delete(Request $request, $id) {
        AuthMiddleware::authorize($request, 'GERANT', 'COMMERCIAL');
        $deleted = Database::getInstance()->deleteTableItem('prospects', 'id', $id);
        if (!$deleted) {
            Response::json(['error' => 'Prospect non trouvé.'], 404);
        }
        Response::json(['success' => true]);
    }

    /** Liste blanche + nettoyage des champs prospect. */
    private static function extract(array $body): array {
        $stage = Sanitizer::pick($body['stage'] ?? 'NOUVEAU', self::STAGES);
        $qualification = Sanitizer::pick($body['qualification'] ?? 'NON_QUALIFIE', self::QUALIFICATIONS);

        $out = [
            'name' => Sanitizer::text($body['name'] ?? '', 200),
            'phone' => Sanitizer::text($body['phone'] ?? '', 40),
            'email' => Sanitizer::text($body['email'] ?? '', 190),
            'source' => Sanitizer::text($body['source'] ?? '', 100),
            'stage' => $stage ?? 'NOUVEAU',
            'qualification' => $qualification ?? 'NON_QUALIFIE',
            'projectType' => Sanitizer::text($body['projectType'] ?? '', 200),
            'estimatedBudget' => Sanitizer::text($body['estimatedBudget'] ?? '', 50),
            'objectives' => Sanitizer::multiline($body['objectives'] ?? '', 5000),
            'nextActionDate' => Sanitizer::date($body['nextActionDate'] ?? '') ?? '',
            'lossReason' => Sanitizer::text($body['lossReason'] ?? '', 1000),
        ];
        $out = array_filter($out, static fn($v) => $v !== '');

        foreach (['interactions', 'meetings', 'history', 'documents'] as $arrayField) {
            if (isset($body[$arrayField]) && is_array($body[$arrayField])) {
                $out[$arrayField] = Sanitizer::deepText($body[$arrayField], 3000);
            }
        }

        return $out;
    }
}
