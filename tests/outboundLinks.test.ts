import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { allowedDomains } from '@/src/config/kaliSites';

describe('Outbound links', () => {
  it('uses configured Kali domains only', () => {
    const root = path.join(__dirname, '..');
    const files = fg.sync(['**/*.{ts,tsx,js,jsx}', '!node_modules/**', '!src/config/kaliSites.ts'], {
      cwd: root,
    });
    const offenders: string[] = [];
    const domain = allowedDomains[0];
    for (const file of files) {
      const content = fs.readFileSync(path.join(root, file), 'utf8');
      if (content.includes(domain)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
