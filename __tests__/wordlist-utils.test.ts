import { normalizeWordlist } from '../utils/wordlist';

describe('normalizeWordlist', () => {
  it('removes empty lines and duplicates while preserving order', () => {
    const input = '\n admin\n\nroot \n admin\nuser\nUSER\n user\n';
    const result = normalizeWordlist(input);

    expect(result.entries).toEqual(['admin', 'root', 'user', 'USER']);
    expect(result.totalEntries).toBe(6);
    expect(result.uniqueCount).toBe(4);
    expect(result.emptyLinesRemoved).toBe(3);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it('handles all whitespace input', () => {
    const result = normalizeWordlist('   \n\t\n');
    expect(result.entries).toEqual([]);
    expect(result.totalEntries).toBe(0);
    expect(result.uniqueCount).toBe(0);
    expect(result.emptyLinesRemoved).toBe(3);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it('returns empty summary for empty input', () => {
    const result = normalizeWordlist('');
    expect(result.entries).toEqual([]);
    expect(result.totalEntries).toBe(0);
    expect(result.uniqueCount).toBe(0);
    expect(result.emptyLinesRemoved).toBe(0);
    expect(result.duplicatesRemoved).toBe(0);
  });
});
