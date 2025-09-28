/** @jest-environment node */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

describe('Kali theme asset paths', () => {
  it('uses the lowercase /themes/kali/ directory', async () => {
    const repoRoot = path.resolve(__dirname, '..');

    const files = await fg(['**/*.{js,jsx,ts,tsx,json,md,mdx}'], {
      cwd: repoRoot,
      absolute: true,
      ignore: [
        'node_modules/**',
        '.next/**',
        'public/**',
        'out/**',
        'coverage/**',
      ],
    });

    const offenders: string[] = [];
    const uppercaseSegment = 'Kali';
    const markers = [`/themes/${uppercaseSegment}`, `\\themes\\${uppercaseSegment}`];

    await Promise.all(
      files.map(async (filePath) => {
        const content = await readFile(filePath, 'utf8');
        if (markers.some((marker) => content.includes(marker))) {
          offenders.push(path.relative(repoRoot, filePath));
        }
      }),
    );

    expect(offenders).toEqual([]);
  });
});
