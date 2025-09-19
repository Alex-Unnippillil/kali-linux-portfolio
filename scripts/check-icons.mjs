import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

const globs = [
  'components/base/**/*.{js,jsx,ts,tsx}',
  'components/menu/**/*.{js,jsx,ts,tsx}',
  'components/screen/**/*.{js,jsx,ts,tsx}',
  'components/util-components/**/*.{js,jsx,ts,tsx}',
  'components/ui/**/*.{js,jsx,ts,tsx}',
  'components/ModuleCard.tsx',
  'apps/beef/**/*.{js,jsx,ts,tsx}',
  'apps/vscode/**/*.{js,jsx,ts,tsx}',
];

const bannedPatterns = [
  '/themes/Yaru/window/',
  '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg',
  '/themes/Yaru/status/network-wireless-signal-none-symbolic.svg',
  '/themes/Yaru/status/audio-volume-medium-symbolic.svg',
  '/themes/Yaru/status/battery-good-symbolic.svg',
  '/themes/Yaru/status/decompiler-symbolic.svg',
  '/themes/Yaru/status/about.svg',
  '/themes/Yaru/status/download.svg',
  '/themes/Yaru/system/view-app-grid-symbolic.svg',
];

function formatViolation(file, line, patterns) {
  const relPath = path.relative(projectRoot, file);
  return `${relPath}:${line} contains ${patterns.join(', ')}`;
}

async function run() {
  const files = await fg(globs, { cwd: projectRoot, absolute: true });
  const violations = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const matches = bannedPatterns.filter((pattern) => line.includes(pattern));
      if (matches.length) {
        violations.push(formatViolation(file, index + 1, matches));
      }
    });
  }

  if (violations.length) {
    console.error('Disallowed icon paths detected:');
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  console.log('Icon path check passed.');
}

run().catch((error) => {
  console.error('Failed to verify icon paths.');
  console.error(error);
  process.exit(1);
});
