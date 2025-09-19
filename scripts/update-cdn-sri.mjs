#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'data', 'cdn-sri.json');

const toSri = (buffer) =>
  `sha384-${createHash('sha384').update(buffer).digest('base64')}`;

const loadData = async () => {
  const raw = await readFile(dataPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.scripts)) {
    throw new Error('cdn-sri.json must include a "scripts" array');
  }
  return parsed;
};

const fetchAsBuffer = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request for ${url} failed with ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const main = async () => {
  const data = await loadData();
  const updates = [];
  for (const entry of data.scripts) {
    if (!entry?.id || !entry?.url) {
      console.warn('[cdn-sri] Skipping malformed entry:', entry);
      continue;
    }
    const buffer = await fetchAsBuffer(entry.url);
    const integrity = toSri(buffer);
    if (entry.integrity !== integrity) {
      updates.push({ id: entry.id, url: entry.url, integrity });
    }
    entry.integrity = integrity;
    console.log(`✔︎ ${entry.id} (${entry.url})`);
    console.log(`    ${integrity}`);
  }
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  if (updates.length) {
    console.log(`Updated ${updates.length} SRI entr${updates.length === 1 ? 'y' : 'ies'} in data/cdn-sri.json.`);
  } else {
    console.log('No changes; hashes already current.');
  }
};

main().catch((err) => {
  console.error('[cdn-sri] Failed to update hashes');
  console.error(err);
  process.exitCode = 1;
});
