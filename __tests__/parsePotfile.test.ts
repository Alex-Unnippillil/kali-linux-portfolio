import { parsePotfile } from '@/components/apps/john/utils';

describe('parsePotfile', () => {
  it('parses lines into hash/password pairs', () => {
    const text = 'hash1:pass1\nhash2:pass2\ninvalid\n';
    expect(parsePotfile(text)).toEqual([
      { hash: 'hash1', password: 'pass1' },
      { hash: 'hash2', password: 'pass2' },
    ]);
  });

  it('allows filtering of parsed entries', () => {
    const text = 'abc:hello\nxyz:world\n';
    const entries = parsePotfile(text);
    const filtered = entries.filter((e) => e.password.includes('hello'));
    expect(filtered).toEqual([{ hash: 'abc', password: 'hello' }]);
  });
});
