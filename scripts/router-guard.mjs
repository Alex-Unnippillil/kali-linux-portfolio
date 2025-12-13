#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'app');

const allowedEntrypoints = new Set([
  path.join('app', 'error.tsx'),
  path.join('app', 'global-error.tsx'),
  path.join('app', 'icon.svg'),
  path.join('app', 'api', 'log-client-error', 'route.ts'),
]);

const routeEntrypointNames = new Set([
  'default',
  'error',
  'global-error',
  'head',
  'icon',
  'layout',
  'loading',
  'not-found',
  'page',
  'route',
  'template',
]);

const routeViolations = [];

const visit = (directory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(fullPath);
      continue;
    }

    const relativePath = path.relative(rootDir, fullPath);
    const basename = path.basename(entry.name, path.extname(entry.name));

    if (routeEntrypointNames.has(basename) && !allowedEntrypoints.has(relativePath)) {
      routeViolations.push(relativePath);
    }
  }
};

if (fs.existsSync(appDir)) {
  visit(appDir);
}

if (routeViolations.length > 0) {
  console.error('App Router is restricted to error handling and telemetry. Add new routes under pages/.');
  console.error('Unauthorized App Router entrypoints detected:');
  for (const file of routeViolations) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}
