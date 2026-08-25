<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;

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
}
