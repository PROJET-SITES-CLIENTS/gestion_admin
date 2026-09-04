<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Comptabilité — comptes de trésorerie et transactions.
 *
 * Réécriture complète : l'ancienne version était cassée (require d'un
 * DataStore.php inexistant, namespace absent) et totalement anonyme
 * (n'importe qui pouvait créer des transactions modifiant les soldes).
 */
class AccountingController {

    private const ROLES_FINANCE = ['GERANT', 'COMPTABLE'];
    private const ACCOUNT_TYPES = ['BANQUE', 'CAISSE', 'MOBILE_MONEY'];
    private const TRANSACTION_TYPES = ['CREDIT', 'DEBIT', 'TRANSFERT_INTERNE'];

    // ------------------------------------------------------------------
    // Comptes de trésorerie
    // ------------------------------------------------------------------
    public function getTreasuryAccounts(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_FINANCE);
        Response::json(['success' => true, 'accounts' => array_values(Database::getInstance()->getTable('treasury_accounts'))]);
    }

    public function createTreasuryAccount(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_FINANCE);
        $body = $request->getBody();

        $name = Sanitizer::text($body['name'] ?? '', 150);
        $type = Sanitizer::pick($body['type'] ?? '', self::ACCOUNT_TYPES);
        $initialBalance = Sanitizer::float($body['balance'] ?? 0);

        if ($name === '' || $type === null) {
            Response::json(['error' => 'Nom et type de compte (BANQUE, CAISSE, MOBILE_MONEY) obligatoires.'], 400);
        }

        $account = [
            'id' => Database::generateId(),
            'name' => $name,
            'type' => $type,
            'balance' => $initialBalance,
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('treasury_accounts', $account);
        Response::json($account, 201);
    }

    // ------------------------------------------------------------------
    // Transactions
    // ------------------------------------------------------------------
    public function getTransactions(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_FINANCE);
        Response::json(['success' => true, 'transactions' => array_values(Database::getInstance()->getTable('transactions'))]);
    }

    public function createTransaction(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_FINANCE);
        $body = $request->getBody();

        $type = Sanitizer::pick($body['type'] ?? '', self::TRANSACTION_TYPES);
        $accountId = Sanitizer::text($body['accountId'] ?? '', 64);
        $toAccountId = isset($body['toAccountId']) ? Sanitizer::text($body['toAccountId'], 64) : null;
        $amount = Sanitizer::float($body['amount'] ?? 0);

        if ($type === null || $accountId === '' || $amount <= 0) {
            Response::json(['error' => 'Type (CREDIT/DEBIT/TRANSFERT_INTERNE), compte et montant (> 0) obligatoires.'], 400);
        }
        if ($type === 'TRANSFERT_INTERNE' && (!$toAccountId || $toAccountId === $accountId)) {
            Response::json(['error' => 'Un transfert interne exige un compte destinataire différent.'], 400);
        }

        $transaction = [
            'id' => Database::generateId(),
            'accountId' => $accountId,
            'toAccountId' => $toAccountId,
            'type' => $type,
            'amount' => $amount,
            'date' => date('c'),
            'referenceId' => Sanitizer::text($body['referenceId'] ?? '', 64),
            'category' => Sanitizer::text($body['category'] ?? 'AUTRE', 80),
            'description' => Sanitizer::text($body['description'] ?? '', 500),
            'isReconciled' => false,
            'attachmentUrl' => Sanitizer::text($body['attachmentUrl'] ?? '', 300),
            'createdBy' => $request->user['id'] ?? '',
        ];

        $db = Database::getInstance();

        // Transaction + mise à jour atomique des soldes.
        $db->transaction(static function ($data) use ($transaction, $type, $accountId, $toAccountId, $amount) {
            if (!isset($data['transactions']) || !is_array($data['transactions'])) {
                $data['transactions'] = [];
            }
            $data['transactions'][] = $transaction;

            $accounts = &$data['treasury_accounts'];
            if (!is_array($accounts)) {
                $accounts = [];
            }

            $sourceExists = false;
            $destExists = !$toAccountId;
            foreach ($accounts as &$acc) {
                if (($acc['id'] ?? '') === $accountId) {
                    $sourceExists = true;
                    $acc['balance'] = ($acc['balance'] ?? 0) + ($type === 'CREDIT' ? $amount : -$amount);
                }
                if ($toAccountId && ($acc['id'] ?? '') === $toAccountId) {
                    $destExists = true;
                    $acc['balance'] = ($acc['balance'] ?? 0) + $amount;
                }
            }
            unset($acc, $accounts);

            if (!$sourceExists || !$destExists) {
                throw new \RuntimeException('Compte de trésorerie introuvable.');
            }

            return $data;
        });

        Response::json($transaction, 201);
    }
}
