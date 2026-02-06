#!/usr/bin/env node

/**
 * start-api.js
 *
 * Starts the API server using a path resolved from this script's location,
 * so it works regardless of current working directory (e.g. on Render).
 * Optionally runs build:api if dist/server.js is missing.
 */

import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = join(__dirname, '..');
const serverPath = join(repoRoot, 'apps', 'api', 'dist', 'server.js');
const apiDir = join(repoRoot, 'apps', 'api');

const exists = existsSync(serverPath);
console.log('[start-api] repoRoot:', repoRoot);
console.log('[start-api] serverPath:', serverPath);
console.log('[start-api] server.js exists:', exists);

if (!exists) {
  console.error('[start-api] server.js not found at', serverPath);
  console.error('[start-api] running pnpm build:api...');
  const build = spawn('pnpm', ['build:api'], {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: true,
  });
  build.on('close', (code) => {
    if (code !== 0) {
      console.error('[start-api] build failed with code', code);
      process.exit(code ?? 1);
    }
    if (!existsSync(serverPath)) {
      console.error('[start-api] server.js still missing after build');
      process.exit(1);
    }
    runServer();
  });
} else {
  runServer();
}

function runServer() {
  const child = spawn(process.execPath, [serverPath], {
    stdio: 'inherit',
    cwd: apiDir,
    env: process.env,
  });
  child.on('close', (code, signal) => {
    process.exit(code ?? (signal ? 128 : 0));
  });
}
