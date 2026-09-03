<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Opérations BTP MULTI-ÉTAPES — exécutées de façon ATOMIQUE côté serveur
 * (même pattern que AgroController).
 *
 * Phase 1 — Facturation d'une situation de travaux :
 *   statut → facturée + transaction CREDIT en trésorerie + notification.
 *   Le module BTP devient enfin CONNECTÉ à la compta du noyau.
 *
 * Phase 4 — Réception d'un bon de commande :
 *   statut → reçu + mouvements d'entrée en stock (dépôt) + DÉPENSE noyau
 *   automatique (TVA 18 %, rattachée au chantier) + notification compta.
 */
class BtpController {

    private const FINANCE_ROLES = ['GERANT', 'COMPTABLE'];
    private const MAGASIN_ROLES = ['GERANT', 'RESP_MATERIEL', 'MAGASINIER_BTP'];

    /**
     * POST /api/btp/situations/:id/facturer  { accountId }
     */
    public function factureSituation(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::FINANCE_ROLES);
        $body = $request->getBody();

        $accountId = Sanitizer::text($body['accountId'] ?? '', 64);
        if ($accountId === '') {
            Response::json(['error' => 'Compte de trésorerie obligatoire.'], 400);
        }

        $db = Database::getInstance();
        $result = null;

        try {
            $db->transaction(static function ($data) use ($id, $accountId, &$result) {
                // 1. La situation doit exister et attendre sa facturation.
                $sitIdx = null;
                foreach ($data['btpSituations'] ?? [] as $i => $s) {
                    if (($s['id'] ?? '') === $id) { $sitIdx = $i; break; }
                }
                if ($sitIdx === null) {
                    throw new \RuntimeException('Situation introuvable.');
                }
                $sit = $data['btpSituations'][$sitIdx];
                if (($sit['statut'] ?? '') !== 'en_attente_facturation') {
                    throw new \RuntimeException("La situation n'est pas en attente de facturation (statut : {$sit['statut']}).");
                }

                $montant = Sanitizer::float($sit['montant_facture'] ?? 0);
                if ($montant <= 0) {
                    throw new \RuntimeException('Montant de la situation invalide.');
                }

                // 2. Le compte de trésorerie doit exister.
                $account = null;
                foreach ($data['treasury_accounts'] ?? [] as $acc) {
                    if (($acc['id'] ?? '') === $accountId) { $account = $acc; break; }
                }
                if ($account === null) {
                    throw new \RuntimeException('Compte de trésorerie introuvable.');
                }

                // 3. Nom du chantier pour la traçabilité.
                $chantierNom = 'chantier inconnu';
                foreach ($data['btpChantiers'] ?? [] as $c) {
                    if (($c['id'] ?? '') === ($sit['chantier_id'] ?? '')) {
                        $chantierNom = $c['nom'] ?? $chantierNom;
                        break;
                    }
                }

                // 4. Situation → facturée.
                $data['btpSituations'][$sitIdx]['statut'] = 'facturée';
                $data['btpSituations'][$sitIdx]['date_facturation'] = date('c');
                $data['btpSituations'][$sitIdx]['updated_at'] = date('c');
                $situation = $data['btpSituations'][$sitIdx];

                // 5. Transaction CREDIT + crédit du solde, dans la même transaction.
                $transaction = [
                    'id' => Database::generateId(),
                    'accountId' => $accountId,
                    'toAccountId' => null,
                    'type' => 'CREDIT',
                    'amount' => $montant,
                    'date' => date('c'),
                    'referenceId' => (string) $id,
                    'category' => 'SITUATION_TRAVAUX',
                    'description' => "Situation {$sit['periode']} — Chantier : {$chantierNom}",
                    'isReconciled' => false,
                    'attachmentUrl' => '',
                    'createdBy' => null,
                    'chantierId' => $sit['chantier_id'] ?? '',
                ];
                if (!isset($data['transactions']) || !is_array($data['transactions'])) {
                    $data['transactions'] = [];
                }
                $data['transactions'][] = $transaction;

                foreach ($data['treasury_accounts'] as &$acc) {
                    if (($acc['id'] ?? '') === $accountId) {
                        $acc['balance'] = Sanitizer::float($acc['balance'] ?? 0) + $montant;
                        break;
                    }
                }
                unset($acc);

                // 6. Notification au Gérant.
                $data['notifications'][] = [
                    'id' => Database::generateId(),
                    'userId' => '',
                    'targetRole' => 'GERANT',
                    'message' => "Situation facturée : {$montant} GNF encaissés sur « {$chantierNom} » ({$sit['periode']}).",
                    'type' => 'SUCCESS',
                    'isRead' => false,
                    'link' => '',
                    'createdAt' => date('c'),
                ];

                $result = ['situation' => $situation, 'transaction' => $transaction, 'chantier_nom' => $chantierNom];
                return $data;
            });
        } catch (\RuntimeException $e) {
            Response::json(['error' => $e->getMessage()], 409);
        }

        Response::json(['success' => true] + $result, 201);
    }

    /**
     * POST /api/btp/bons/:id/recevoir
     * Réception : stock (dépôt) + dépense noyau (TVA 18 %, chantier) + notif compta.
     */
    public function recevoirBonCommande(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::MAGASIN_ROLES);

        $db = Database::getInstance();
        $result = null;

        try {
            $db->transaction(static function ($data) use ($id, &$result) {
                // 1. Le BC doit exister et être soumis.
                $bcIdx = null;
                foreach ($data['btpBonCommandes'] ?? [] as $i => $bc) {
                    if (($bc['id'] ?? '') === $id) { $bcIdx = $i; break; }
                }
                if ($bcIdx === null) {
                    throw new \RuntimeException('Bon de commande introuvable.');
                }
                $bc = $data['btpBonCommandes'][$bcIdx];
                if (($bc['statut'] ?? '') !== 'soumis') {
                    throw new \RuntimeException("Le bon de commande n'est pas réceptionnable (statut : {$bc['statut']}).");
                }

                $lignes = $bc['lignes'] ?? [];
                if (!is_array($lignes) || empty($lignes)) {
                    throw new \RuntimeException('Bon de commande sans lignes.');
                }
                $totalHT = Sanitizer::float($bc['total_ht'] ?? 0);
                if ($totalHT <= 0) {
                    // Recalcul défensif depuis les lignes.
                    $totalHT = 0;
                    foreach ($lignes as $l) {
                        $totalHT += Sanitizer::float($l['quantite'] ?? 0) * Sanitizer::float($l['pu'] ?? 0);
                    }
                }
                $tva = round($totalHT * 0.18, 2);
                $ttc = $totalHT + $tva;

                // 2. Chantier pour le rattachement.
                $chantierId = $bc['chantier_id'] ?? '';
                $chantierNom = '';
                foreach ($data['btpChantiers'] ?? [] as $c) {
                    if (($c['id'] ?? '') === $chantierId) { $chantierNom = $c['nom'] ?? ''; break; }
                }

                // 3. Mouvements d'entrée en stock DÉPÔT (chantier_id = '').
                $mouvements = [];
                if (!isset($data['btpMouvements']) || !is_array($data['btpMouvements'])) {
                    $data['btpMouvements'] = [];
                }
                foreach ($lignes as $l) {
                    $mvt = [
                        'id' => Database::generateId(),
                        'article_id' => Sanitizer::text($l['article_id'] ?? '', 64),
                        'type' => 'entree',
                        'quantite' => Sanitizer::float($l['quantite'] ?? 0),
                        'chantier_id' => '',
                        'bc_id' => (string) $id,
                        'motif' => 'Réception BC ' . substr((string) $id, 0, 8) . ($chantierNom ? " — {$chantierNom}" : ''),
                        'created_by' => '',
                        'createdAt' => date('c'),
                        'updated_at' => date('c'),
                    ];
                    $mouvements[] = $mvt;
                    $data['btpMouvements'][] = $mvt;
                }

                // 4. BC → reçu.
                $data['btpBonCommandes'][$bcIdx]['statut'] = 'reçu';
                $data['btpBonCommandes'][$bcIdx]['date_reception'] = date('c');
                $data['btpBonCommandes'][$bcIdx]['updated_at'] = date('c');
                $bcRecu = $data['btpBonCommandes'][$bcIdx];

                // 5. Dépense noyau automatique (PENDING → validation compta).
                $expense = [
                    'id' => Database::generateId(),
                    'category' => 'ACHAT_MARCHANDISE',
                    'amountHT' => $totalHT,
                    'tvaAmount' => $tva,
                    'amountTTC' => $ttc,
                    'description' => 'BC ' . substr((string) $id, 0, 8) . ' — ' . ($bc['fournisseur'] ?? 'fournisseur') . ($chantierNom ? " (Chantier : {$chantierNom})" : ''),
                    'date' => date('Y-m-d'),
                    'status' => 'PENDING',
                    'accountId' => '',
                    'attachmentUrl' => '',
                    'chantier_id' => $chantierId,
                    'createdBy' => '',
                    'createdAt' => date('c'),
                ];
                if (!isset($data['expenses']) || !is_array($data['expenses'])) {
                    $data['expenses'] = [];
                }
                $data['expenses'][] = $expense;

                // 6. Notification compta.
                $data['notifications'][] = [
                    'id' => Database::generateId(),
                    'userId' => '',
                    'targetRole' => 'COMPTABLE',
                    'message' => "Bon de commande réceptionné ({$ttc} GNF TTC) : dépense en attente de validation" . ($chantierNom ? " — Chantier {$chantierNom}." : '.'),
                    'type' => 'INFO',
                    'isRead' => false,
                    'link' => '',
                    'createdAt' => date('c'),
                ];

                $result = ['bon_commande' => $bcRecu, 'mouvements' => $mouvements, 'expense' => $expense];
                return $data;
            });
        } catch (\RuntimeException $e) {
            Response::json(['error' => $e->getMessage()], 409);
        }

        Response::json(['success' => true] + $result, 201);
    }
}
