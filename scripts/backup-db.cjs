/**
 * Sauvegarde horodatée de db.json (source de vérité unique de l'ERP).
 *
 * Usage : npm run backup          (ou : node scripts/backup-db.cjs)
 * Les N dernières sauvegardes sont conservées dans backups/ (défaut : 30).
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'db.json');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const KEEP = 30;

if (!fs.existsSync(DB_FILE)) {
  console.error('[backup] db.json introuvable — rien à sauvegarder.');
  process.exit(1);
}

// Vérifie que la base est un JSON valide AVANT de la copier
// (ne jamais sauvegarder un fichier corrompu par dessus un bon backup).
const raw = fs.readFileSync(DB_FILE, 'utf8');
try {
  JSON.parse(raw);
} catch (e) {
  console.error('[backup] db.json est CORROMPU — sauvegarde annulée pour préserver les backups existants.');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const target = path.join(BACKUP_DIR, `db-${stamp}.json`);
fs.copyFileSync(DB_FILE, target);
console.log(`[backup] OK → ${target}`);

// Purge des anciennes sauvegardes
const backups = fs.readdirSync(BACKUP_DIR)
  .filter(f => /^db-.*\.json$/.test(f))
  .sort();
while (backups.length > KEEP) {
  const oldest = backups.shift();
  fs.unlinkSync(path.join(BACKUP_DIR, oldest));
  console.log(`[backup] purge de l'ancienne sauvegarde ${oldest}`);
}
