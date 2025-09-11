#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parsePotfile } from '../components/apps/john/utils.js';

function main() {
  const [filePath, filter = ''] = process.argv.slice(2);
  if (!filePath) {
    console.error('Usage: node john/potfile.mjs <file> [filter]');
    process.exit(1);
  }
  const text = readFileSync(filePath, 'utf8');
  const entries = parsePotfile(text);
  const lowered = filter.toLowerCase();
  const filtered = filter
    ? entries.filter(
        (p) =>
          p.hash.includes(filter) ||
          p.password.toLowerCase().includes(lowered)
      )
    : entries;
  filtered.forEach((p) => {
    console.log(`${p.hash}:${p.password}`);
  });
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
