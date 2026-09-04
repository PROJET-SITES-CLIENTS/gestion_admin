-- Structure de la base MySQL pour la migration depuis db.json
-- (optionnelle : l'application fonctionne nativement sur db.json)

CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `first_name` VARCHAR(100),
    `last_name` VARCHAR(100),
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `projects` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `status` VARCHAR(50) DEFAULT 'NOUVEAU',
    `client_info` JSON,
    `commercial_info` JSON,
    `generated_prd` JSON,
    `documents` JSON,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `prospects` (
    `id` VARCHAR(36) PRIMARY KEY,
    `data` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
    `id` VARCHAR(36) PRIMARY KEY,
    `data` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `company_config` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `config_data` JSON NOT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertion de la configuration par défaut
INSERT IGNORE INTO `company_config` (`id`, `config_data`) VALUES (1, '{}');
