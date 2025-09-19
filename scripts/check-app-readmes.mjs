import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..');
const APPS_DIR = path.join(ROOT, 'apps');

const dirs = fs
  .readdirSync(APPS_DIR)
  .filter((name) => fs.statSync(path.join(APPS_DIR, name)).isDirectory())
  .sort();

const missing = [];

for (const dir of dirs) {
  const readmePath = path.join(APPS_DIR, dir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    missing.push(path.relative(ROOT, readmePath));
  }
}

if (missing.length > 0) {
  console.error('The following app directories are missing README.md files:');
  for (const file of missing) {
    console.error(` - ${file}`);
  }
  process.exitCode = 1;
} else {
  console.log('All app directories contain README.md files.');
}
