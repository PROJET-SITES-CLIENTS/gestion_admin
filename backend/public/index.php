<?php
/**
 * Point d'entrée unique de l'API — EINSOF GESTION ERP.
 *
 * Chargement de toutes les classes du backend, configuration .env,
 * déclaration des routes et dispatch.
 */
require_once __DIR__ . '/../core/Config.php';
require_once __DIR__ . '/../core/Sanitizer.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Request.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Router.php';
require_once __DIR__ . '/../core/AuthMiddleware.php';
require_once __DIR__ . '/../core/RateLimiter.php';

require_once __DIR__ . '/../utils/JwtUtils.php';

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ProjectController.php';
require_once __DIR__ . '/../controllers/DataController.php';
require_once __DIR__ . '/../controllers/UploadController.php';
require_once __DIR__ . '/../controllers/ProspectController.php';
require_once __DIR__ . '/../controllers/ExpenseController.php';
require_once __DIR__ . '/../controllers/ConfigController.php';
require_once __DIR__ . '/../controllers/MessageController.php';
require_once __DIR__ . '/../controllers/RhController.php';
require_once __DIR__ . '/../controllers/AccountingController.php';
require_once __DIR__ . '/../controllers/TaskController.php';
require_once __DIR__ . '/../controllers/CrudController.php';
require_once __DIR__ . '/../controllers/AgroController.php';
require_once __DIR__ . '/../controllers/BtpController.php';

use App\core\Router;
use App\core\Response;
use App\core\Config;
use App\core\AuthMiddleware;
use App\controllers\UploadController;

Config::load(__DIR__ . '/../.env');

$router = new Router();

// ------------------------------------------------------------------
// Santé
// ------------------------------------------------------------------
$router->get('/api/ping', static function () {
    Response::json(['message' => 'pong', 'time' => time()]);
});

// ------------------------------------------------------------------
// Authentification & comptes
// ------------------------------------------------------------------
$router->post('/api/auth/login', [\App\controllers\AuthController::class, 'login']);
$router->post('/api/auth/register', [\App\controllers\AuthController::class, 'register']);
$router->get('/api/users', [\App\controllers\AuthController::class, 'getUsers']);
$router->post('/api/users/:id/delete', [\App\controllers\AuthController::class, 'deleteUser']);

// ------------------------------------------------------------------
// Données (alimentation initiale du frontend)
// ------------------------------------------------------------------
$router->get('/api/data', [\App\controllers\DataController::class, 'getData']);

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------
$router->post('/api/config/update', [\App\controllers\ConfigController::class, 'update']);
$router->get('/api/public/config', [\App\controllers\ConfigController::class, 'getPublic']);

// ------------------------------------------------------------------
// Messagerie interne
// ------------------------------------------------------------------
$router->post('/api/messages', [\App\controllers\MessageController::class, 'create']);
$router->post('/api/messages/:id/read', [\App\controllers\MessageController::class, 'markAsRead']);

// ------------------------------------------------------------------
// Tâches & notifications (routes précédemment manquantes)
// ------------------------------------------------------------------
$router->post('/api/tasks', [\App\controllers\TaskController::class, 'createTask']);
$router->post('/api/tasks/:id/update', [\App\controllers\TaskController::class, 'updateTask']);
$router->post('/api/notifications', [\App\controllers\TaskController::class, 'createNotification']);
$router->post('/api/notifications/:id/read', [\App\controllers\TaskController::class, 'markNotificationAsRead']);

// ------------------------------------------------------------------
// RH
// ------------------------------------------------------------------
$router->get('/api/rh/data', [\App\controllers\RhController::class, 'getRhData']);
$router->post('/api/rh/employees', [\App\controllers\RhController::class, 'createEmployee']);
$router->post('/api/rh/employees/:id/update', [\App\controllers\RhController::class, 'updateEmployee']);
$router->post('/api/rh/contracts', [\App\controllers\RhController::class, 'createContract']);
$router->post('/api/rh/leaves', [\App\controllers\RhController::class, 'createLeaveRequest']);
$router->post('/api/rh/leaves/:id/update', [\App\controllers\RhController::class, 'updateLeaveRequest']);
$router->post('/api/rh/payslips', [\App\controllers\RhController::class, 'createPayslip']);
$router->post('/api/rh/payslips/:id/update', [\App\controllers\RhController::class, 'updatePayslip']);

// ------------------------------------------------------------------
// Prospection CRM
// ------------------------------------------------------------------
$router->post('/api/prospects', [\App\controllers\ProspectController::class, 'create']);
$router->post('/api/prospects/:id/update', [\App\controllers\ProspectController::class, 'update']);
$router->post('/api/prospects/:id/delete', [\App\controllers\ProspectController::class, 'delete']);

// ------------------------------------------------------------------
// Dépenses
// ------------------------------------------------------------------
$router->post('/api/expenses', [\App\controllers\ExpenseController::class, 'create']);
$router->post('/api/expenses/:id/update', [\App\controllers\ExpenseController::class, 'update']);
$router->post('/api/expenses/:id/delete', [\App\controllers\ExpenseController::class, 'delete']);

// ------------------------------------------------------------------
// Comptabilité — trésorerie
// ------------------------------------------------------------------
$router->get('/api/accounting/accounts', [\App\controllers\AccountingController::class, 'getTreasuryAccounts']);
$router->post('/api/accounting/accounts', [\App\controllers\AccountingController::class, 'createTreasuryAccount']);
$router->get('/api/accounting/transactions', [\App\controllers\AccountingController::class, 'getTransactions']);
$router->post('/api/accounting/transactions', [\App\controllers\AccountingController::class, 'createTransaction']);

// ------------------------------------------------------------------
// Projets
// ------------------------------------------------------------------
$router->post('/api/projects', [\App\controllers\ProjectController::class, 'create']);
$router->post('/api/projects/:id/update', [\App\controllers\ProjectController::class, 'update']);
$router->post('/api/projects/:id/delete', [\App\controllers\ProjectController::class, 'delete']);

// ------------------------------------------------------------------
// CRUD générique : modules BTP, Agro, Assistante
// ------------------------------------------------------------------
$router->post('/api/crud/:table', [\App\controllers\CrudController::class, 'create']);
$router->post('/api/crud/:table/:id/update', [\App\controllers\CrudController::class, 'update']);
$router->post('/api/crud/:table/:id/delete', [\App\controllers\CrudController::class, 'delete']);

// ------------------------------------------------------------------
// Opérations Agro atomiques (multi-tables, transaction serveur)
// ------------------------------------------------------------------
$router->post('/api/agro/lots-production', [\App\controllers\AgroController::class, 'createLotProduction']);
$router->post('/api/agro/livraisons', [\App\controllers\AgroController::class, 'prepareLivraison']);

// ------------------------------------------------------------------
// Opérations BTP atomiques (extension)
//   - facturation d'une situation → trésorerie + notification
//   - réception d'un bon de commande → stock + dépense noyau + notification
// ------------------------------------------------------------------
$router->post('/api/btp/situations/:id/facturer', [\App\controllers\BtpController::class, 'factureSituation']);
$router->post('/api/btp/avenants/:id/valider', [\App\controllers\BtpController::class, 'validerAvenant']);
$router->post('/api/btp/chantiers/:id/liberer-retenues', [\App\controllers\BtpController::class, 'libererRetenues']);
$router->post('/api/btp/bons/:id/recevoir', [\App\controllers\BtpController::class, 'recevoirBonCommande']);

// ------------------------------------------------------------------
// Uploads
// ------------------------------------------------------------------
$router->post('/api/uploads', [\App\controllers\UploadController::class, 'upload']);

/**
 * Service des fichiers uploadés — AUTHENTIFICATION OBLIGATOIRE.
 * (Les contrats, factures et pièces d'identité ne doivent pas être publics.)
 * Contre-mesure path traversal : realpath() + confinement dans uploads/.
 */
$serveUpload = static function ($req, $file) {
    AuthMiddleware::authenticate($req);

    $uploadsDir = realpath(UploadController::uploadsDir());
    if ($uploadsDir === false) {
        Response::json(['error' => 'Not found'], 404);
    }

    $requested = $uploadsDir . '/' . basename($file);
    $real = realpath($requested);
    if ($real === false || strpos($real, $uploadsDir) !== 0 || !is_file($real)) {
        Response::json(['error' => 'Not found'], 404);
    }

    $mime = function_exists('mime_content_type') ? mime_content_type($real) : 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($real));
    header('X-Content-Type-Options: nosniff');
    readfile($real);
    exit;
};

$router->get('/uploads/:file', $serveUpload);
$router->get('/api/uploads/:file', $serveUpload);

$router->resolve();
