import { readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const rootDir = process.cwd();

async function listJsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await listJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function check(filePath) {
  await stat(filePath);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', filePath], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`node --check failed for ${path.relative(rootDir, filePath)}`));
    });
  });
}

const files = await listJsFiles(rootDir);

for (const file of files) {
  await check(file);
}

console.log(`Checked ${files.length} JS files`);
