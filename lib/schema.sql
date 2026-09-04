-- ============================================================
-- EINSOF ERP — Schéma PostgreSQL (Neon)
-- Approche document store : chaque entité = (collection, id, data JSONB)
-- Mappe directement le modèle db.json du backend PHP
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);

-- Index pour accélérer les requêtes par collection
CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);

-- Table dédiée pour les users (auth rapide avec username indexé)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed : compte admin par défaut
INSERT INTO users (id, username, password_hash, role, first_name, last_name)
VALUES (
  'admin-default',
  'admin',
  '$2a$10$X5oFKvWwxJ0KVmZR92cWcuYLqJLaUbYT7qQGHbZKKy3OMcLWwUzKm', -- admin123
  'GERANT',
  'Admin',
  'System'
) ON CONFLICT (username) DO NOTHING;
