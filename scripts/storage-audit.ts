import fs from 'fs';
import fg from 'fast-glob';

export interface StorageUsage {
  file: string;
  line: number;
  code: string;
}

const ignorePatterns = [
  'node_modules/**',
  '.next/**',
  'dist/**',
  'coverage/**',
  '__tests__/**',
  '**/*.test.*',
  'playwright/**',
  'scripts/storage-audit.ts',
  'scripts/storage-audit.js',
];

export function getStorageUsage(): StorageUsage[] {
  const files = fg.sync(['**/*.{js,jsx,ts,tsx}'], { ignore: ignorePatterns });
  const usages: StorageUsage[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (line.includes('localStorage') || line.includes('sessionStorage')) {
        usages.push({ file, line: idx + 1, code: line.trim() });
      }
    });
  }
  return usages.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

if (require.main === module) {
  const results = getStorageUsage();
  console.log(JSON.stringify(results, null, 2));
}
