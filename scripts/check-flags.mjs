import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const registryPath = path.join(repoRoot, 'data/feature-flags.json');
const registryRaw = JSON.parse(await readFile(registryPath, 'utf8'));
if (!Array.isArray(registryRaw)) {
  console.error('Feature flag registry must be an array in data/feature-flags.json');
  process.exit(1);
}
const validIds = new Set(
  registryRaw
    .filter((flag) => typeof flag?.id === 'string')
    .map((flag) => flag.id)
);

const patterns = [
  'apps/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
];

const files = await fg(patterns, {
  cwd: repoRoot,
  absolute: true,
  ignore: ['**/node_modules/**', '**/__tests__/**'],
});

const unknownUsages = [];
const flagRegex = /useFeatureFlag(?:<[^>]*>)?\s*\(\s*(['"`])([^'"`]+)\1/g;

for (const file of files) {
  const content = await readFile(file, 'utf8');
  let match;
  while ((match = flagRegex.exec(content)) !== null) {
    const [, , id] = match;
    if (!validIds.has(id)) {
      const snippet = content.slice(0, match.index);
      const line = snippet.split(/\r?\n/).length;
      unknownUsages.push({
        file: path.relative(repoRoot, file),
        line,
        id,
      });
    }
  }
}

if (unknownUsages.length > 0) {
  console.error('Unknown feature flag ids detected:\n');
  for (const usage of unknownUsages) {
    console.error(` - ${usage.file}:${usage.line} references "${usage.id}"`);
  }
  process.exit(1);
}

console.log('✓ Feature flag references are valid.');
