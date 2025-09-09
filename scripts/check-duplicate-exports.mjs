#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetFile = path.resolve(__dirname, '../apps.config.js');

const content = readFileSync(targetFile, 'utf8');
const regex = /export const\s+(\w+)/g;
const counts = new Map();
let match;
while ((match = regex.exec(content)) !== null) {
  const name = match[1];
  counts.set(name, (counts.get(name) || 0) + 1);
}
const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
if (duplicates.length > 0) {
  console.error('Duplicate export const declarations detected in apps.config.js:');
  for (const [name, count] of duplicates) {
    console.error(` - ${name} (x${count})`);
  }
  process.exit(1);
}
