import fs from 'fs';
import path from 'path';
import { murmurhash3_32_gc } from '@apps/favicon-hash';

function hashFile(rel: string): string {
  const file = fs.readFileSync(path.join(__dirname, '..', rel));
  const base64 = file.toString('base64');
  return murmurhash3_32_gc(base64);
}

describe('favicon hash', () => {
  test('hashes hash.svg correctly', () => {
    expect(
      hashFile('public/themes/Yaru/apps/hash.svg')
    ).toBe('1635832192');
  });

  test('hashes calc.png correctly', () => {
    expect(
      hashFile('public/themes/Yaru/apps/calc.png')
    ).toBe('-1557554903');
  });
});
