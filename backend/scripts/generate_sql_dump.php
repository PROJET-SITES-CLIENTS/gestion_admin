<?php

$jsonPath = __DIR__ . '/../../db.json';
$outputPath = __DIR__ . '/../../deploy/public_html/hostinger_database.sql';

if (!file_exists($jsonPath)) {
    die("db.json introuvable au chemin: $jsonPath\n");
}

$data = json_decode(file_get_contents($jsonPath), true);
$sql = "-- Script SQL généré pour Hostinger\n\n";

// Include Schema creation first
$schemaPath = __DIR__ . '/../database/schema.sql';
if (file_exists($schemaPath)) {
    $sql .= file_get_contents($schemaPath) . "\n\n";
} else {
    die("schema.sql introuvable.\n");
}

$sql .= "-- ==========================================\n";
$sql .= "-- INSERTION DES DONNEES MIGREES\n";
$sql .= "-- ==========================================\n\n";

function escape($value) {
    if ($value === null) return 'NULL';
    $value = str_replace("'", "''", $value);
    return "'" . $value . "'";
}

// 1. Users
if (isset($data['users']) && is_array($data['users'])) {
    $sql .= "-- Table: users\n";
    foreach ($data['users'] as $u) {
        $id = escape($u['id']);
        $username = escape($u['username']);
        $passwordHash = escape($u['passwordHash']);
        $plainPassword = escape($u['plainPassword'] ?? '');
        $role = escape($u['role']);
        $firstName = escape($u['firstName'] ?? '');
        $lastName = escape($u['lastName'] ?? '');
        $createdAt = escape($u['createdAt'] ?? date('Y-m-d H:i:s'));
        
        $sql .= "INSERT IGNORE INTO users (id, username, password_hash, plain_password, role, first_name, last_name, created_at) VALUES ($id, $username, $passwordHash, $plainPassword, $role, $firstName, $lastName, $createdAt);\n";
    }
    $sql .= "\n";
}

// 2. Projects
if (isset($data['projects']) && is_array($data['projects'])) {
    $sql .= "-- Table: projects\n";
    foreach ($data['projects'] as $p) {
        $id = escape($p['id']);
        $name = escape($p['name']);
        $status = escape($p['status'] ?? 'NOUVEAU');
        $clientInfo = escape(json_encode($p['clientInfo'] ?? []));
        $commercialInfo = escape(json_encode($p['commercialInfo'] ?? []));
        $generatedPrd = escape(json_encode($p['generatedPrd'] ?? []));
        $documents = escape(json_encode($p['documents'] ?? []));
        $createdAt = escape(isset($p['createdAt']) ? date('Y-m-d H:i:s', strtotime($p['createdAt'])) : date('Y-m-d H:i:s'));

        $sql .= "INSERT IGNORE INTO projects (id, name, status, client_info, commercial_info, generated_prd, documents, created_at) VALUES ($id, $name, $status, $clientInfo, $commercialInfo, $generatedPrd, $documents, $createdAt);\n";
    }
    $sql .= "\n";
}

// 3. Prospects
if (isset($data['prospects']) && is_array($data['prospects'])) {
    $sql .= "-- Table: prospects\n";
    foreach ($data['prospects'] as $p) {
        $idStr = $p['id'];
        $createdAtStr = isset($p['createdAt']) ? date('Y-m-d H:i:s', strtotime($p['createdAt'])) : date('Y-m-d H:i:s');
        unset($p['id'], $p['createdAt'], $p['updatedAt']);
        
        $id = escape($idStr);
        $createdAt = escape($createdAtStr);
        $dataJson = escape(json_encode($p));

        $sql .= "INSERT IGNORE INTO prospects (id, data, created_at) VALUES ($id, $dataJson, $createdAt);\n";
    }
    $sql .= "\n";
}

// 4. Expenses
if (isset($data['expenses']) && is_array($data['expenses'])) {
    $sql .= "-- Table: expenses\n";
    foreach ($data['expenses'] as $e) {
        $idStr = $e['id'];
        $createdAtStr = isset($e['createdAt']) ? date('Y-m-d H:i:s', strtotime($e['createdAt'])) : date('Y-m-d H:i:s');
        unset($e['id'], $e['createdAt']);
        
        $id = escape($idStr);
        $createdAt = escape($createdAtStr);
        $dataJson = escape(json_encode($e));

        $sql .= "INSERT IGNORE INTO expenses (id, data, created_at) VALUES ($id, $dataJson, $createdAt);\n";
    }
    $sql .= "\n";
}

// 5. Config
if (isset($data['companyConfig'])) {
    $sql .= "-- Table: company_config\n";
    $cfg = escape(json_encode($data['companyConfig']));
    $sql .= "UPDATE company_config SET config_data = $cfg WHERE id = 1;\n";
    $sql .= "\n";
}

file_put_contents($outputPath, $sql);
echo "Fichier SQL g\u00e9n\u00e9r\u00e9 avec succ\u00e8s : $outputPath\n";
