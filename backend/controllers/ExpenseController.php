<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Dépenses / notes de frais.
 * Ajout de la route update manquante (validation / rejet / paiement)
 * que le frontend appelait déjà sans succès.
 */
class ExpenseController {

    // FINANCE + rôles chantier (dépenses directement depuis le pilotage BTP)
    private const EXPENSE_ROLES = ['GERANT', 'COMPTABLE', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'RESP_MATERIEL'];
    private const STATUSES = ['PENDING', 'PAID', 'REJECTED'];

    public function create(Request $request) {
        AuthMiddleware::authorize($request, ...self::EXPENSE_ROLES);
        $body = $request->getBody();

        $amountTTC = Sanitizer::float($body['amountTTC'] ?? 0);
        if ($amountTTC <= 0) {
            Response::json(['error' => 'Montant invalide.'], 400);
        }

        $expense = [
            'id' => Database::generateId(),
            'category' => Sanitizer::pick($body['category'] ?? 'AUTRE', [
                'ACHAT_MARCHANDISE', 'SALAIRE', 'CHARGES_SOCIALES', 'LOYER',
                'ELECTRICITE', 'INTERNET', 'IMPOTS', 'FOURNITURES',
                'PRESTATION_SERVICE', 'TRANSPORT', 'ENTRETIEN', 'CARBURANT',
                'AUTRE'
            ]) ?? 'AUTRE',
            'amountHT' => max(0, Sanitizer::float($body['amountHT'] ?? 0)),
            'tvaAmount' => max(0, Sanitizer::float($body['tvaAmount'] ?? 0)),
            'amountTTC' => $amountTTC,
            'description' => Sanitizer::text($body['description'] ?? '', 1000),
            'date' => Sanitizer::date($body['date'] ?? '') ?? date('Y-m-d'),
            'status' => 'PENDING',
            'accountId' => Sanitizer::text($body['accountId'] ?? '', 64),
            'attachmentUrl' => Sanitizer::text($body['attachmentUrl'] ?? '', 300),
            'chantier_id' => Sanitizer::text($body['chantier_id'] ?? '', 64),
            'createdBy' => $request->user['id'] ?? '',
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('expenses', $expense);
        Response::json($expense, 201);
    }

    public function update(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::EXPENSE_ROLES);
        $body = $request->getBody();

        $status = Sanitizer::pick($body['status'] ?? '', self::STATUSES);
        if ($status === null) {
            Response::json(['error' => 'Statut invalide (PENDING, PAID, REJECTED).'], 400);
        }

        $updated = Database::getInstance()->updateTableItem('expenses', 'id', $id,
            static function ($exp) use ($status, $body) {
                $exp['status'] = $status;
                if ($status === 'REJECTED') {
                    $exp['rejectionReason'] = Sanitizer::multiline($body['rejectionReason'] ?? '', 1000);
                }
                if (isset($body['accountId'])) {
                    $exp['accountId'] = Sanitizer::text($body['accountId'], 64);
                }
                $exp['updatedAt'] = date('c');
                return $exp;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Dépense non trouvée.'], 404);
        }
        Response::json($updated);
    }

    public function delete(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::EXPENSE_ROLES);
        $deleted = Database::getInstance()->deleteTableItem('expenses', 'id', $id);
        if (!$deleted) {
            Response::json(['error' => 'Dépense non trouvée.'], 404);
        }
        Response::json(['success' => true]);
    }
}
