<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Communication unifiée : tâches inter-services et notifications.
 *
 * Ces routes étaient appelées par le frontend mais N'EXISTAIENT PAS dans le
 * routeur PHP : le TaskBoard, la cloche de notifications et la validation des
 * dépenses échouaient en silence. L'expéditeur est toujours dérivé du token.
 */
class TaskController {

    // ------------------------------------------------------------------
    // Tâches
    // ------------------------------------------------------------------
    public function createTask(Request $request) {
        $user = AuthMiddleware::authenticate($request);
        $body = $request->getBody();

        $receiverRole = Sanitizer::pick($body['receiverRole'] ?? '', array_merge(AuthController::VALID_ROLES, ['ALL']));
        $title = Sanitizer::text($body['title'] ?? '', 250);
        $content = Sanitizer::multiline($body['content'] ?? '', 10000);

        if ($receiverRole === null || trim($title) === '') {
            Response::json(['error' => 'Destinataire et titre obligatoires.'], 400);
        }

        $task = [
            'id' => Database::generateId(),
            'senderId' => (string) ($user['id'] ?? ''),
            'senderRole' => (string) ($user['role'] ?? ''),
            'senderName' => trim(($user['firstName'] ?? '') . ' ' . ($user['lastName'] ?? '')) ?: (string) ($user['username'] ?? ''),
            'receiverRole' => $receiverRole,
            'title' => $title,
            'content' => $content,
            'status' => 'TODO',
            'priority' => Sanitizer::pick($body['priority'] ?? 'MEDIUM', ['LOW', 'MEDIUM', 'HIGH']) ?? 'MEDIUM',
            'link' => Sanitizer::text($body['link'] ?? '', 300),
            'escalated' => false,
            'createdAt' => date('c'),
            'updatedAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('tasks', $task);
        Response::json($task, 201);
    }

    public function updateTask(Request $request, $id) {
        AuthMiddleware::authenticate($request);
        $body = $request->getBody();

        $updated = Database::getInstance()->updateTableItem('tasks', 'id', $id,
            static function ($t) use ($body) {
                if (isset($body['status'])) {
                    $status = Sanitizer::pick($body['status'], ['TODO', 'IN_PROGRESS', 'DONE']);
                    if ($status !== null) {
                        $t['status'] = $status;
                    }
                }
                if (isset($body['escalated'])) {
                    $t['escalated'] = Sanitizer::bool($body['escalated']);
                }
                if (isset($body['priority'])) {
                    $priority = Sanitizer::pick($body['priority'], ['LOW', 'MEDIUM', 'HIGH']);
                    if ($priority !== null) {
                        $t['priority'] = $priority;
                    }
                }
                $t['updatedAt'] = date('c');
                return $t;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Tâche non trouvée.'], 404);
        }
        Response::json($updated);
    }

    // ------------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------------
    public function createNotification(Request $request) {
        AuthMiddleware::authenticate($request);
        $body = $request->getBody();

        $targetRole = Sanitizer::pick($body['targetRole'] ?? '', array_merge(AuthController::VALID_ROLES, ['ALL']));
        $message = Sanitizer::text($body['message'] ?? '', 1000);

        if ($targetRole === null || trim($message) === '') {
            Response::json(['error' => 'Rôle cible et message obligatoires.'], 400);
        }

        $notification = [
            'id' => Database::generateId(),
            'userId' => (string) ($request->user['id'] ?? ''),
            'targetRole' => $targetRole,
            'message' => $message,
            'type' => Sanitizer::pick($body['type'] ?? 'INFO', ['INFO', 'WARNING', 'SUCCESS', 'ERROR']) ?? 'INFO',
            'isRead' => false,
            'link' => Sanitizer::text($body['link'] ?? '', 300),
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('notifications', $notification);
        Response::json($notification, 201);
    }

    public function markNotificationAsRead(Request $request, $id) {
        AuthMiddleware::authenticate($request);

        $updated = Database::getInstance()->updateTableItem('notifications', 'id', $id,
            static function ($n) {
                $n['isRead'] = true;
                return $n;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Notification non trouvée.'], 404);
        }
        Response::json(['success' => true]);
    }
}
