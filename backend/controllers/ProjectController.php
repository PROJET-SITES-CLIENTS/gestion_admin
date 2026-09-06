<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Projets commerciaux.
 * Durcissement : sanitization anti-XSS des champs texte, liste blanche des statuts.
 * Les règles métier de rôle (PASSER en PAYE réservé GERANT/COMPTABLE, etc.) sont conservées.
 */
class ProjectController {

    private const STATUSES = ['NOUVEAU', 'EN_COURS', 'EN_COURS_DEV', 'TERMINE', 'PAYE', 'ANNULE'];
    private const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID'];

    public function create(Request $request) {
        AuthMiddleware::authenticate($request);
        $body = $request->getBody();

        $status = Sanitizer::pick($body['status'] ?? 'NOUVEAU', self::STATUSES) ?? 'NOUVEAU';

        $newProject = [
            'id' => Database::generateId(),
            'name' => Sanitizer::text($body['name'] ?? 'Nouveau Dossier', 250),
            'clientName' => Sanitizer::text($body['clientName'] ?? 'Non défini', 250),
            'clientContact' => Sanitizer::text($body['clientContact'] ?? '', 300),
            'prospectId' => Sanitizer::text($body['prospectId'] ?? '', 64),
            'description' => Sanitizer::multiline($body['description'] ?? '', 20000),
            'budget' => max(0, Sanitizer::float($body['budget'] ?? 0)),
            'status' => $status,
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
            'paymentStatus' => 'PENDING',
            'accountantPaymentConfirm' => false,
            'documents' => []
        ];

        Database::getInstance()->insertTableItem('projects', $newProject);
        Response::json($newProject, 201);
    }

    public function update(Request $request, $id) {
        $user = AuthMiddleware::authenticate($request);
        $role = $user['role'] ?? '';
        $body = $request->getBody();

        $updatedProject = Database::getInstance()->updateTableItem('projects', 'id', $id,
            static function ($project) use ($body, $role) {
                if (array_key_exists('name', $body)) {
                    $project['name'] = Sanitizer::text($body['name'], 250);
                }
                if (array_key_exists('clientName', $body)) {
                    $project['clientName'] = Sanitizer::text($body['clientName'], 250);
                }
                if (array_key_exists('clientContact', $body)) {
                    $project['clientContact'] = Sanitizer::text($body['clientContact'], 300);
                }
                if (array_key_exists('description', $body)) {
                    $project['description'] = Sanitizer::multiline($body['description'], 20000);
                }
                if (isset($body['budget'])) {
                    $project['budget'] = max(0, Sanitizer::float($body['budget']));
                }

                if (isset($body['status'])) {
                    $newStatus = Sanitizer::pick($body['status'], ProjectController::STATUSES);
                    if ($newStatus !== null) {
                        // Le passage à PAYE reste réservé aux finances.
                        if ($newStatus !== 'PAYE' || in_array($role, ['GERANT', 'COMPTABLE'], true)) {
                            $project['status'] = $newStatus;
                        }
                    }
                }

                if (isset($body['accountantPaymentConfirm']) && in_array($role, ['GERANT', 'COMPTABLE'], true)) {
                    $project['accountantPaymentConfirm'] = Sanitizer::bool($body['accountantPaymentConfirm']);
                }

                if (isset($body['commercialPaymentConfirm'])) {
                    $project['commercialPaymentConfirm'] = Sanitizer::bool($body['commercialPaymentConfirm']);
                }

                if (isset($body['paymentStatus']) && in_array($role, ['GERANT', 'COMPTABLE'], true)) {
                    $ps = Sanitizer::pick($body['paymentStatus'], ProjectController::PAYMENT_STATUSES);
                    if ($ps !== null) {
                        $project['paymentStatus'] = $ps;
                    }
                }

                if (isset($body['paymentPlan']) && is_array($body['paymentPlan'])) {
                    // 2000 caractères par chaîne : intitulés d'échéances.
                    $project['paymentPlan'] = Sanitizer::deepText($body['paymentPlan'], 2000);
                }

                if (isset($body['documents']) && is_array($body['documents'])) {
                    // 20000 : les documents SPECS contiennent du contenu long.
                    $project['documents'] = Sanitizer::deepText($body['documents'], 20000);
                }

                $project['updatedAt'] = date('Y-m-d H:i:s');
                return $project;
            }
        );

        if (!$updatedProject) {
            Response::json(['error' => 'Projet non trouvé.'], 404);
        }
        Response::json($updatedProject);
    }

    public function delete(Request $request, $id) {
        AuthMiddleware::authorize($request, 'GERANT');
        $deleted = Database::getInstance()->deleteTableItem('projects', 'id', $id);
        if (!$deleted) {
            Response::json(['error' => 'Projet non trouvé.'], 404);
        }
        Response::json(['success' => true]);
    }
}
