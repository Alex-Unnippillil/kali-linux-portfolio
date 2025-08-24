import safeRegex from 'safe-regex';

describe('pcre-re2-lab', () => {
  test('detects catastrophic backtracking patterns', () => {
    expect(safeRegex('(a+)+$')).toBe(false);
  });

  test('lookbehind unsupported in RE2', async () => {
    const pattern = '(?<=a)b';
    expect('ab'.match(new RegExp(pattern))).not.toBeNull();
    const mod = await import('re2-wasm');
    expect(() => new mod.RE2(pattern, 'u')).toThrow();
  });
});
