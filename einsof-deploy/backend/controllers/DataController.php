<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * GET /api/data — alimentation initiale du frontend.
 *
 * Sécurité :
 *  - La configuration retournée est FILTRÉE par liste blanche : aucun secret
 *    (system_jwt_secret, etc.) ne peut fuiter vers le client.
 *  - Données sensibles restreintes par rôle :
 *      * finances (dépenses, trésorerie, transactions) => GERANT / COMPTABLE
 *      * données RH (employés, contrats, congés, paie)   => GERANT / RH
 *      * messagerie / tâches                              => filtrées par rôle
 */
class DataController {
    /** Clés de configuration autorisées à sortir du serveur. */
    public const PUBLIC_CONFIG_KEYS = [
        'companyName', 'companyAddress', 'companyId', 'companyEmail', 'companyPhone',
        'logoUrl', 'logoBase64', 'stampUrl', 'signatureUrl',
        'bankingDetails', 'contractTerms',
        'clientTarget', 'targetAmountPerClient',
        'rhSmig', 'rhCnssEmployerRate', 'rhCnssEmployeeRate', 'rhCnssCeiling',
        'rhRtsAbattement', 'rhRtsRate',
        'tvaRate',
        'delegations', 'activeModules', 'btpPermissions',
    ];

    /** Filtre une configuration par liste blanche (anti-fuite de secrets). */
    public static function sanitizeConfig(array $config): array {
        $out = [];
        foreach (self::PUBLIC_CONFIG_KEYS as $key) {
            if (array_key_exists($key, $config)) {
                $out[$key] = $config[$key];
            }
        }
        return $out;
    }

    public function getData(Request $request) {
        $user = AuthMiddleware::authenticate($request);
        $role = $user['role'] ?? '';
        $userId = $user['id'] ?? '';

        $db = Database::getInstance();

        $projects = array_values($db->getTable('projects'));
        $prospects = array_values($db->getTable('prospects'));

        // Fusion : table legacy 'companyConfig' (seed) + table 'config' (updates live),
        // puis filtrage par liste blanche.
        $companyConfig = self::sanitizeConfig(array_merge(
            $db->getTable('companyConfig') ?: [],
            $db->getTable('config') ?: []
        ));

        // --- Finances : GERANT / COMPTABLE uniquement ---
        $expenses = [];
        $treasuryAccounts = [];
        $transactions = [];
        if (in_array($role, ['GERANT', 'COMPTABLE'], true)) {
            $expenses = array_values($db->getTable('expenses'));
            $treasuryAccounts = array_values($db->getTable('treasury_accounts'));
            $transactions = array_values($db->getTable('transactions'));
        }

        // --- RH : GERANT / RH uniquement (données personnelles + salaires) ---
        $employees = [];
        $contracts = [];
        $leaveRequests = [];
        $payslips = [];
        if (in_array($role, ['GERANT', 'RH'], true)) {
            $employees = array_values($db->getTable('employees'));
            $contracts = array_values($db->getTable('contracts'));
            $leaveRequests = array_values($db->getTable('leave_requests'));
            $payslips = array_values($db->getTable('payslips'));
        }

        // --- Messagerie : uniquement les messages qui me concernent ---
        $internalMessages = array_values(array_filter(
            $db->getTable('internal_messages'),
            static function ($m) use ($role, $userId) {
                $receiver = $m['receiverRole'] ?? '';
                return $receiver === 'ALL'
                    || $receiver === $role
                    || ($m['senderId'] ?? '') === $userId;
            }
        ));

        // --- Tâches : reçues (mon rôle) ou envoyées par moi ---
        $tasks = array_values(array_filter(
            $db->getTable('tasks'),
            static function ($t) use ($role, $userId) {
                $senderId = $t['senderId'] ?? ($t['senderRole'] ?? '');
                return ($t['receiverRole'] ?? '') === $role
                    || ($t['receiverRole'] ?? '') === 'ALL'
                    || $senderId === $userId;
            }
        ));

        // --- Notifications ciblées sur mon rôle ---
        $notifications = array_values(array_filter(
            $db->getTable('notifications'),
            static function ($n) use ($role) {
                return ($n['targetRole'] ?? '') === $role
                    || ($n['targetRole'] ?? '') === 'ALL';
            }
        ));

        Response::json([
            'projects' => $projects,
            'prospects' => $prospects,
            'companyConfig' => $companyConfig,
            'expenses' => $expenses,
            'internal_messages' => $internalMessages,
            'employees' => $employees,
            'contracts' => $contracts,
            'leave_requests' => $leaveRequests,
            'payslips' => $payslips,
            'treasury_accounts' => $treasuryAccounts,
            'transactions' => $transactions,
            'tasks' => $tasks,
            'notifications' => $notifications,

            // Module BTP
            'btpOffres' => array_values($db->getTable('btpOffres')),
            'btpChantiers' => array_values($db->getTable('btpChantiers')),
            'btpEngins' => array_values($db->getTable('btpEngins')),
            'btpIncidents' => array_values($db->getTable('btpIncidents')),
            'btpJournaux' => array_values($db->getTable('btpJournaux')),
            'btpSituations' => array_values($db->getTable('btpSituations')),
            'btpAffectations' => array_values($db->getTable('btpAffectations')),
            'btpPointages' => array_values($db->getTable('btpPointages')),
            'btpArticles' => array_values($db->getTable('btpArticles')),
            'btpBonCommandes' => array_values($db->getTable('btpBonCommandes')),
            'btpMouvements' => array_values($db->getTable('btpMouvements')),
            'btpDocuments' => array_values($db->getTable('btpDocuments')),
            'btpAvenants' => array_values($db->getTable('btpAvenants')),
            'btpOs' => array_values($db->getTable('btpOs')),
            'btpSousTraitances' => array_values($db->getTable('btpSousTraitances')),
            'btpFournisseurs' => array_values($db->getTable('btpFournisseurs')),
            'btpCautionnements' => array_values($db->getTable('btpCautionnements')),
            'btpInspections' => array_values($db->getTable('btpInspections')),
            'btpPrixUnitaires' => array_values($db->getTable('btpPrixUnitaires')),
            'btpHeuresEngins' => array_values($db->getTable('btpHeuresEngins')),
            // Agrégats financiers par chantier (les dépenses brutes restent
            // réservées GERANT/COMPTABLE — ici seuls les totaux partent).
            'btpChantierStats' => self::computeChantierStats($db),
            // Annuaire light (sans salaires) pour les rôles BTP (affectations,
            // pointages) — les dossiers RH complets restent réservés GERANT/RH.
            'btpEmployeeDirectory' => self::employeeDirectory($db),

            // Module Agro
            'agroLotMatierePremieres' => array_values($db->getTable('agroLotMatierePremieres')),
            'agroLotProductions' => array_values($db->getTable('agroLotProductions')),
            'agroControles' => array_values($db->getTable('agroControles')),
            'agroCommandes' => array_values($db->getTable('agroCommandes')),
            'agroLignesLivrees' => array_values($db->getTable('agroLignesLivrees')),
            'agroFiches' => array_values($db->getTable('agroFiches')),
            'agroReclamations' => array_values($db->getTable('agroReclamations')),

            // Module Assistante
            'agendaEvents' => array_values($db->getTable('agendaEvents')),
            'devisRecords' => array_values($db->getTable('devisRecords')),
        ]);
    }

    /**
     * Agrégats par chantier : dépenses engagées, situations facturées/en
     * attente, coût de main d'œuvre réel (pointages × taux d'affectation).
     * Calculés à la lecture — aucune donnée brute RH/finance n'est exposée.
     */
    private static function computeChantierStats(Database $db): array {
        $expenses = $db->getTable('expenses');
        $situations = $db->getTable('btpSituations');
        $pointages = $db->getTable('btpPointages');
        $affectations = $db->getTable('btpAffectations');
        $mouvements = $db->getTable('btpMouvements');
        $heuresEngins = $db->getTable('btpHeuresEngins');
        $engins = $db->getTable('btpEngins');
        $sousTraitances = $db->getTable('btpSousTraitances');

        // Taux journalier par (employé, chantier)
        $taux = [];
        foreach ($affectations as $a) {
            $key = ($a['employee_id'] ?? '') . '|' . ($a['chantier_id'] ?? '');
            $taux[$key] = Sanitizer::float($a['taux_journalier'] ?? 0);
        }

        // Taux horaire par engin
        $tauxEngin = [];
        foreach ($engins as $e) {
            $tauxEngin[$e['id'] ?? ''] = Sanitizer::float($e['taux_horaire'] ?? 0);
        }

        $stats = [];
        foreach ($db->getTable('btpChantiers') as $c) {
            $id = $c['id'] ?? '';
            $stats[$id] = [
                'id' => $id,
                'budget_engage' => 0.0,
                'montant_situations_facturees' => 0.0,
                'montant_situations_attente' => 0.0,
                'cout_mo_reel' => 0.0,
                'heures_pointees' => 0.0,
                'cout_engins' => 0.0,
                'cout_stock_sorti' => 0.0,
                'cout_sous_traitance' => 0.0,
                'retenue_bloquee' => 0.0,
            ];
        }

        foreach ($expenses as $e) {
            $cid = $e['chantier_id'] ?? '';
            if ($cid === '' || !isset($stats[$cid])) continue;
            if (($e['status'] ?? '') === 'REJECTED') continue;
            // TTC (format actuel), sinon champ legacy 'amount'.
            $montant = isset($e['amountTTC']) ? Sanitizer::float($e['amountTTC']) : Sanitizer::float($e['amount'] ?? 0);
            $stats[$cid]['budget_engage'] += $montant;
        }

        foreach ($situations as $s) {
            $cid = $s['chantier_id'] ?? '';
            if (!isset($stats[$cid])) continue;
            $montant = Sanitizer::float($s['montant_facture'] ?? 0);
            if (($s['statut'] ?? '') === 'facturée') {
                $stats[$cid]['montant_situations_facturees'] += $montant;
                if (empty($s['retenue_liberee'])) {
                    $stats[$cid]['retenue_bloquee'] += Sanitizer::float($s['retenue_amount'] ?? 0);
                }
            } elseif (($s['statut'] ?? '') === 'en_attente_facturation') {
                $stats[$cid]['montant_situations_attente'] += $montant;
            }
        }

        foreach ($pointages as $p) {
            $cid = $p['chantier_id'] ?? '';
            if (!isset($stats[$cid])) continue;
            $heures = Sanitizer::float($p['heures'] ?? 0);
            $stats[$cid]['heures_pointees'] += $heures;
            $key = ($p['employee_id'] ?? '') . '|' . $cid;
            $tauxJournalier = $taux[$key] ?? 0;
            $stats[$cid]['cout_mo_reel'] += ($heures / 8.0) * $tauxJournalier;
        }

        // Coût matière réellement consommé (sorties valorisées vers le chantier)
        foreach ($mouvements as $m) {
            $cid = $m['chantier_id'] ?? '';
            if ($cid === '' || !isset($stats[$cid])) continue;
            if (($m['type'] ?? '') !== 'sortie_chantier') continue;
            $cu = isset($m['cout_unitaire']) ? Sanitizer::float($m['cout_unitaire']) : 0.0;
            $stats[$cid]['cout_stock_sorti'] += Sanitizer::float($m['quantite'] ?? 0) * $cu;
        }

        // Imputation des heures engins (heures × taux horaire de l'engin)
        foreach ($heuresEngins as $h) {
            $cid = $h['chantier_id'] ?? '';
            if (!isset($stats[$cid])) continue;
            $stats[$cid]['cout_engins'] += Sanitizer::float($h['heures'] ?? 0) * ($tauxEngin[$h['engin_id'] ?? ''] ?? 0);
        }

        // Sous-traitance non résiliée
        foreach ($sousTraitances as $st) {
            $cid = $st['chantier_id'] ?? '';
            if (!isset($stats[$cid])) continue;
            if (($st['statut'] ?? '') === 'résiliée') continue;
            $stats[$cid]['cout_sous_traitance'] += Sanitizer::float($st['montant'] ?? 0);
        }

        return array_values($stats);
    }

    /** Annuaire minimal (id, nom) — pas de salaires ni données personnelles. */
    private static function employeeDirectory(Database $db): array {
        $out = [];
        foreach ($db->getTable('employees') as $e) {
            $out[] = [
                'id' => $e['id'] ?? '',
                'firstName' => $e['firstName'] ?? '',
                'lastName' => $e['lastName'] ?? '',
                'position' => $e['position'] ?? '',
            ];
        }
        return $out;
    }
}
