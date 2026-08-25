<?php
/**
 * Migration db.json -> MySQL (optionnelle).
 *
 * Corrigé vs version précédente :
 *  - Établit une VRAIE connexion PDO (l'ancienne version appelait prepare()
 *    sur la classe JSON Database — erreur fatale garantie).
 *  - Lit `password_hash` avec repli sur `passwordHash` (incohérence de clés).
 *  - Plus AUCUNE colonne plain_password (les mots de passe en clair sont bannis).
 *  - Transaction globale : la migration est atomique.
 *  - Vérifie les insertions et compte les lignes migrées.
 *  - Réservé au CLI.
 */

if (PHP_SAPI !== 'cli') {
    exit('Ce script doit être exécuté en ligne de commande (CLI uniquement).');
}

require_once __DIR__ . '/../core/Config.php';

use App\core\Config;

Config::load(__DIR__ . '/../.env');

$jsonPath = __DIR__ . '/../../db.json';
if (!file_exists($jsonPath)) {
    exit("db.json introuvable au chemin : $jsonPath\n");
}
$data = json_decode((string) file_get_contents($jsonPath), true);
if (!is_array($data)) {
    exit("db.json est corrompu (JSON invalide).\n");
}

$host = Config::get('DB_HOST', 'localhost');
$name = Config::get('DB_NAME');
$user = Config::get('DB_USER');
$pass = Config::get('DB_PASS');

if (!$name || !$user) {
    exit("Renseignez DB_HOST / DB_NAME / DB_USER / DB_PASS dans backend/.env avant la migration.\n");
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$name;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    exit('Connexion MySQL impossible : ' . $e->getMessage() . "\n");
}

$counters = ['users' => 0, 'projects' => 0, 'prospects' => 0, 'expenses' => 0];

try {
    $pdo->beginTransaction();

    // 1. Utilisateurs (hash uniquement — jamais de mot de passe en clair)
    if (!empty($data['users'])) {
        $stmt = $pdo->prepare(
            "INSERT INTO users (id, username, password_hash, role, first_name, last_name, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($data['users'] as $u) {
            $hash = $u['password_hash'] ?? $u['passwordHash'] ?? '';
            if ($hash === '') {
                echo "  [SAUT] utilisateur '{$u['username']}' sans hash — à recréer via l'interface.\n";
                continue;
            }
            $stmt->execute([
                $u['id'],
                $u['username'],
                $hash,
                $u['role'],
                $u['first_name'] ?? $u['firstName'] ?? '',
                $u['last_name'] ?? $u['lastName'] ?? '',
                ($u['isActive'] ?? true) ? 1 : 0,
                date('Y-m-d H:i:s', strtotime((string) ($u['created_at'] ?? 'now'))),
            ]);
            $counters['users'] += $stmt->rowCount();
        }
    }

    // 2. Projets
    if (!empty($data['projects'])) {
        $stmt = $pdo->prepare(
            "INSERT INTO projects (id, name, status, client_info, commercial_info, generated_prd, documents, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($data['projects'] as $p) {
            $stmt->execute([
                $p['id'],
                $p['name'],
                $p['status'] ?? 'NOUVEAU',
                json_encode($p['clientInfo'] ?? []),
                json_encode($p['commercialInfo'] ?? []),
                json_encode($p['generatedPrd'] ?? []),
                json_encode($p['documents'] ?? []),
                date('Y-m-d H:i:s', strtotime((string) ($p['createdAt'] ?? 'now'))),
            ]);
            $counters['projects'] += $stmt->rowCount();
        }
    }

    // 3. Prospects
    if (!empty($data['prospects'])) {
        $stmt = $pdo->prepare("INSERT INTO prospects (id, data, created_at) VALUES (?, ?, ?)");
        foreach ($data['prospects'] as $p) {
            $id = $p['id'];
            $createdAt = date('Y-m-d H:i:s', strtotime((string) ($p['createdAt'] ?? 'now')));
            unset($p['id'], $p['createdAt'], $p['updatedAt']);
            $stmt->execute([$id, json_encode($p, JSON_UNESCAPED_UNICODE), $createdAt]);
            $counters['prospects'] += $stmt->rowCount();
        }
    }

    // 4. Dépenses
    if (!empty($data['expenses'])) {
        $stmt = $pdo->prepare("INSERT INTO expenses (id, data, created_at) VALUES (?, ?, ?)");
        foreach ($data['expenses'] as $e) {
            $id = $e['id'];
            $createdAt = date('Y-m-d H:i:s', strtotime((string) ($e['createdAt'] ?? $e['date'] ?? 'now')));
            unset($e['id'], $e['createdAt']);
            $stmt->execute([$id, json_encode($e, JSON_UNESCAPED_UNICODE), $createdAt]);
            $counters['expenses'] += $stmt->rowCount();
        }
    }

    // 5. Configuration (tables legacy 'companyConfig' + 'config' fusionnées, secrets exclus)
    $config = array_merge($data['companyConfig'] ?? [], $data['config'] ?? []);
    unset($config['system_jwt_secret']);
    if ($config) {
        $stmt = $pdo->prepare("UPDATE company_config SET config_data = ? WHERE id = 1");
        $stmt->execute([json_encode($config, JSON_UNESCAPED_UNICODE)]);
    }

    $pdo->commit();
    echo "Migration terminée : "
        . "{$counters['users']} utilisateurs, {$counters['projects']} projets, "
        . "{$counters['prospects']} prospects, {$counters['expenses']} dépenses.\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    exit('Échec de la migration (rollback effectué) : ' . $e->getMessage() . "\n");
}
