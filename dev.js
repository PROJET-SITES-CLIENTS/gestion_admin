import { spawn } from 'child_process';
import path from 'path';

console.log('Starting PHP backend on port 8000...');
const phpProcess = spawn('C:\\xampp\\php\\php.exe', ['-S', 'localhost:8000', '-t', 'backend/public', 'backend/public/index.php'], {
  stdio: 'inherit',
  shell: true
});

console.log(`Starting Vite dev server...`);
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  phpProcess.kill();
  viteProcess.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  phpProcess.kill();
  viteProcess.kill();
  process.exit();
});
