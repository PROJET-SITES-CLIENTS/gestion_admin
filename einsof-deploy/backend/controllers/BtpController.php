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

                // Ventilation HT / TVA / retenue de garantie (Vague 2).
                // Retour par défaut : montant TTC, pas de TVA détaillée, pas de retenue.
                $montantHt = isset($sit['montant_ht']) ? Sanitizer::float($sit['montant_ht']) : $montant;
                $tva = isset($sit['tva_amount']) ? Sanitizer::float($sit['tva_amount']) : 0.0;
                $retenue = isset($sit['retenue_amount']) ? Sanitizer::float($sit['retenue_amount']) : 0.0;
                if ($retenue > $montant) {
                    throw new \RuntimeException('La retenue de garantie dépasse le montant de la situation.');
                }
                $net = $montant - $retenue;

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

                // 5. Transaction CREDIT du NET encaissé (montant − retenue)
                //    + crédit du solde, dans la même transaction.
                $transaction = [
                    'id' => Database::generateId(),
                    'accountId' => $accountId,
                    'toAccountId' => null,
                    'type' => 'CREDIT',
                    'amount' => $net,
                    'date' => date('c'),
                    'referenceId' => (string) $id,
                    'category' => 'SITUATION_TRAVAUX',
                    'description' => "Situation {$sit['periode']} — Chantier : {$chantierNom}"
                        . ($tva > 0 ? " (HT {$montantHt} + TVA {$tva})" : '')
                        . ($retenue > 0 ? " — retenue garantie {$retenue}" : ''),
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
                        $acc['balance'] = Sanitizer::float($acc['balance'] ?? 0) + $net;
                        break;
                    }
                }
                unset($acc);

                // 6. Notifications : Gérant + Comptable (tâche de suivi de la retenue).
                $data['notifications'][] = [
                    'id' => Database::generateId(),
                    'userId' => '',
                    'targetRole' => 'GERANT',
                    'message' => "Situation facturée : {$net} GNF encaissés sur « {$chantierNom} » ({$sit['periode']})" . ($retenue > 0 ? " — retenue de garantie bloquée : {$retenue} GNF." : '.'),
                    'type' => 'SUCCESS',
                    'isRead' => false,
                    'link' => '',
                    'createdAt' => date('c'),
                ];

                $result = [
                    'situation' => $situation,
                    'transaction' => $transaction,
                    'chantier_nom' => $chantierNom,
                    'retenue' => $retenue,
                    'net' => $net,
                ];
                return $data;
            });
        } catch (\RuntimeException $e) {
            Response::json(['error' => $e->getMessage()], 409);
        }

        Response::json(['success' => true] + $result, 201);
    }

    /**
     * POST /api/btp/avenants/:id/valider
     * Valide un avenant et l'APPLIQUE atomiquement au chantier :
     * budget_initial ± montant, date_fin_prevue + jours (avec report du début si nécessaire).
     */
    public function validerAvenant(Request $request, $id) {
        AuthMiddleware::authorize($request, 'GERANT');

        $db = Database::getInstance();
        $result = null;

        try {
            $db->transaction(static function ($data) use ($id, &$result) {
                $avIdx = null;
                foreach ($data['btpAvenants'] ?? [] as $i => $av) {
                    if (($av['id'] ?? '') === $id) { $avIdx = $i; break; }
                }
                if ($avIdx === null) {
                    throw new \RuntimeException('Avenant introuvable.');
                }
                $av = $data['btpAvenants'][$avIdx];
                if (($av['statut'] ?? '') !== 'brouillon') {
                    throw new \RuntimeException("Avenant déjà traité (statut : {$av['statut']}).");
                }

                $chIdx = null;
                foreach ($data['btpChantiers'] ?? [] as $i => $c) {
                    if (($c['id'] ?? '') === ($av['chantier_id'] ?? '')) { $chIdx = $i; break; }
                }
                if ($chIdx === null) {
                    throw new \RuntimeException('Chantier de l\'avenant introuvable.');
                }

                $montant = Sanitizer::float($av['montant'] ?? 0);
                $jours = max(0, Sanitizer::int($av['jours_delai'] ?? 0));
                $type = $av['type'] ?? 'montant';

                // Application au chantier
                if (in_array($type, ['montant', 'montant_delai'], true) && $montant != 0.0) {
                    $data['btpChantiers'][$chIdx]['budget_initial'] = Sanitizer::float($data['btpChantiers'][$chIdx]['budget_initial'] ?? 0) + $montant;
                }
                if (in_array($type, ['delai', 'montant_delai'], true) && $jours > 0) {
                    $fin = $data['btpChantiers'][$chIdx]['date_fin_prevue'] ?? null;
                    $baseTime = $fin ? strtotime((string) $fin) : time();
                    if ($baseTime === false) { $baseTime = time(); }
                    $data['btpChantiers'][$chIdx]['date_fin_prevue'] = date('Y-m-d', $baseTime + $jours * 86400);
                }

                $data['btpAvenants'][$avIdx]['statut'] = 'validé';
                $data['btpAvenants'][$avIdx]['updated_at'] = date('c');

                $data['notifications'][] = [
                    'id' => Database::generateId(),
                    'userId' => '',
                    'targetRole' => 'COND_TRAVAUX',
                    'message' => "Avenant {$id} validé sur « {$data['btpChantiers'][$chIdx]['nom']} »"
                        . ($montant != 0.0 ? " : budget " . ($montant > 0 ? '+' : '') . $montant . ' GNF' : '')
                        . ($jours > 0 ? " délai +{$jours} j" : '') . '.',
                    'type' => 'INFO',
                    'isRead' => false,
                    'link' => '',
                    'createdAt' => date('c'),
                ];

                $result = ['avenant' => $data['btpAvenants'][$avIdx], 'chantier' => $data['btpChantiers'][$chIdx]];
                return $data;
            });
        } catch (\RuntimeException $e) {
            Response::json(['error' => $e->getMessage()], 409);
        }

        Response::json(['success' => true] + $result, 201);
    }

    /**
     * POST /api/btp/chantiers/:id/liberer-retenues  { accountId }
     * À la réception définitive : libère TOUTES les retenues de garanties
     * non libérées (transaction CREDIT + marquage), atomiquement.
     */
    public function libererRetenues(Request $request, $id) {
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
                $chIdx = null;
                foreach ($data['btpChantiers'] ?? [] as $i => $c) {
                    if (($c['id'] ?? '') === $id) { $chIdx = $i; break; }
                }
                if ($chIdx === null) {
                    throw new \RuntimeException('Chantier introuvable.');
                }
                $chantier = $data['btpChantiers'][$chIdx];
                if (!in_array($chantier['statut'] ?? '', ['réception_définitive', 'clôturé'], true)) {
                    throw new \RuntimeException('Les retenues ne se libèrent qu\'après la réception définitive.');
                }

                $account = null;
                foreach ($data['treasury_accounts'] ?? [] as $acc) {
                    if (($acc['id'] ?? '') === $accountId) { $account = $acc; break; }
                }
                if ($account === null) {
                    throw new \RuntimeException('Compte de trésorerie introuvable.');
                }

                // Total des retenues facturées non libérées
                $total = 0.0;
                $count = 0;
                foreach ($data['btpSituations'] ?? [] as $i => $s) {
                    if (($s['chantier_id'] ?? '') !== $id) continue;
                    if (($s['statut'] ?? '') !== 'facturée') continue;
                    if (!empty($s['retenue_liberee'])) continue;
                    $total += Sanitizer::float($s['retenue_amount'] ?? 0);
                    $data['btpSituations'][$i]['retenue_liberee'] = true;
                    $data['btpSituations'][$i]['updated_at'] = date('c');
                    $count++;
                }
                if ($count === 0 || $total <= 0) {
                    throw new \RuntimeException('Aucune retenue à libérer sur ce chantier.');
                }

                $transaction = [
                    'id' => Database::generateId(),
                    'accountId' => $accountId,
                    'toAccountId' => null,
                    'type' => 'CREDIT',
                    'amount' => $total,
                    'date' => date('c'),
                    'referenceId' => (string) $id,
                    'category' => 'SITUATION_TRAVAUX',
                    'description' => "Libération retenues de garantie ({$count} situations) — Chantier : {$chantier['nom']}",
                    'isReconciled' => false,
                    'attachmentUrl' => '',
                    'createdBy' => null,
                    'chantierId' => (string) $id,
                ];
                $data['transactions'][] = $transaction;

                foreach ($data['treasury_accounts'] as &$acc) {
                    if (($acc['id'] ?? '') === $accountId) {
                        $acc['balance'] = Sanitizer::float($acc['balance'] ?? 0) + $total;
                        break;
                    }
                }
                unset($acc);

                $data['notifications'][] = [
                    'id' => Database::generateId(),
                    'userId' => '',
                    'targetRole' => 'GERANT',
                    'message' => "Retenues de garantie libérées : {$total} GNF encaissés sur « {$chantier['nom']} ».",
                    'type' => 'SUCCESS',
                    'isRead' => false,
                    'link' => '',
                    'createdAt' => date('c'),
                ];

                $result = ['transaction' => $transaction, 'total_liberre' => $total, 'situations' => $count];
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
