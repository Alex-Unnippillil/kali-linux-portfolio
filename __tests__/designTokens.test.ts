import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';

const TARGET_PATTERNS = [
  'components/screen/**/*.{js,jsx,ts,tsx}',
  'components/ui/**/*.{js,jsx,ts,tsx}',
  'components/**/*.module.css',
];

const PROHIBITED_PATTERNS = [
  /#[0-9A-Fa-f]{3,8}\b/,
  /\brgba?\(/,
  /\bhsla?\(/,
  /\bbg-(?:black|white)\b/,
  /\btext-(?:black|white)\b/,
  /\bborder-(?:black|white)\b/,
];

describe('design tokens', () => {
  it('avoids hard-coded color literals in desktop UI', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const files = fg.sync(TARGET_PATTERNS, {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/__tests__/**', '**/node_modules/**'],
    });

    const failures: Record<string, string[]> = {};

    files.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const hits = PROHIBITED_PATTERNS.filter((pattern) => pattern.test(content));
      if (hits.length > 0) {
        failures[path.relative(projectRoot, file)] = hits.map((pattern) => pattern.source);
      }
    });

    expect(failures).toEqual({});
  });
});
