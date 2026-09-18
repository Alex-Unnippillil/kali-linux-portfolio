import { readFile, writeFile } from 'node:fs/promises';
const source = new URL('../data/projects.json', import.meta.url);
const destination = new URL('../public/projects.json', import.meta.url);
const records = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(records) || records.some((p) => !p.slug || !p.repo || !p.source)) throw new Error('Invalid canonical portfolio data');
if (process.argv.includes('--check')) {
  const publicData = JSON.parse(await readFile(destination, 'utf8'));
  if (JSON.stringify(records) !== JSON.stringify(publicData)) throw new Error('Run node scripts/sync-portfolio.mjs to update the public catalog');
} else await writeFile(destination, `${JSON.stringify(records, null, 2)}\n`);
