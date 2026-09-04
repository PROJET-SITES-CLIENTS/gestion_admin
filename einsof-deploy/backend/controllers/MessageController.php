<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Messagerie interne.
 *
 * Réécriture : authentification obligatoire et identité de l'expéditeur
 * dérivée du TOKEN (l'ancienne version permettait à quiconque d'usurper
 * senderId / senderRole / senderName dans le corps de la requête).
 */
class MessageController {

    /** Rôles destinataires valides (alignés sur AuthController::VALID_ROLES + ALL). */
    private static function validReceivers(): array {
        return array_merge(AuthController::VALID_ROLES, ['ALL']);
    }

    public function create(Request $request) {
        $user = AuthMiddleware::authenticate($request);
        $body = $request->getBody();

        $receiverRole = Sanitizer::pick($body['receiverRole'] ?? '', self::validReceivers());
        $content = Sanitizer::multiline($body['content'] ?? '', 5000);

        if ($receiverRole === null || trim($content) === '') {
            Response::json(['error' => 'Destinataire et message obligatoires.'], 400);
        }

        // Identité serveur : jamais celle fournie par le client.
        $senderId = (string) ($user['id'] ?? '');
        $senderRole = (string) ($user['role'] ?? '');
        $senderName = trim(($user['firstName'] ?? '') . ' ' . ($user['lastName'] ?? ''));
        if ($senderName === '') {
            $senderName = (string) ($user['username'] ?? 'Utilisateur');
        }

        $attachment = null;
        if (isset($body['attachment']) && is_array($body['attachment'])) {
            $attachment = [
                'name' => Sanitizer::text($body['attachment']['name'] ?? '', 200),
                'url' => Sanitizer::text($body['attachment']['url'] ?? '', 300),
            ];
        }

        $newMessage = [
            'id' => Database::generateId(),
            'senderId' => $senderId,
            'senderName' => $senderName,
            'senderRole' => $senderRole,
            'receiverRole' => $receiverRole,
            'content' => $content,
            'attachment' => $attachment,
            'timestamp' => date('c'),
            'isRead' => false
        ];

        Database::getInstance()->insertTableItem('internal_messages', $newMessage);
        Response::json($newMessage, 201);
    }

    public function markAsRead(Request $request, $id) {
        $user = AuthMiddleware::authenticate($request);

        $updated = Database::getInstance()->updateTableItem('internal_messages', 'id', $id,
            static function ($msg) use ($user) {
                $msg['isRead'] = true;
                return $msg;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Message non trouvé.'], 404);
        }
        Response::json(['success' => true]);
    }
}
