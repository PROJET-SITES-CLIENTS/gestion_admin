import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Chemin du binaire PHP : configurable via la variable d'environnement PHP_PATH.
// Ordre de résolution : PHP_PATH > détections courantes (XAMPP/Laragon) > "php" du PATH.
function resolvePhp() {
  if (process.env.PHP_PATH) return process.env.PHP_PATH;

  const candidates = [
    'C:\\xampp\\php\\php.exe',
    'C:\\laragon\\bin\\php\\php-8.3\\php.exe',
    'C:\\laragon\\bin\\php\\php-8.2\\php.exe',
    'C:\\php\\php.exe',
    '/usr/bin/php',
    '/usr/local/bin/php',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'php'; //Fallback : PHP dans le PATH
}

const php = resolvePhp();
const backendDir = path.join(process.cwd(), 'backend', 'public');
const router = path.join(backendDir, 'index.php');

if (!fs.existsSync(path.join(process.cwd(), 'backend', '.env'))) {
  console.warn('\x1b[33m[warn] backend/.env est ABSENT — copiez backend/.env.example vers backend/.env et renseignez JWT_SECRET, sinon l\'API refusera de démarrer.\x1b[0m');
}

console.log(`Démarrage du backend PHP (${php}) sur le port 8000...`);
const phpProcess = spawn(php, ['-S', 'localhost:8000', '-t', backendDir, router], {
  stdio: 'inherit',
  shell: true
});

console.log('Démarrage du serveur de dev Vite (port 3005)...');
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

const shutdown = () => {
  phpProcess.kill();
  viteProcess.kill();
  process.exit();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
