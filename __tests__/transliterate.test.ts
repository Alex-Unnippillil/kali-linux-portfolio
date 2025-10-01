import {
  matchesSearchQuery,
  normalizeForSearch,
  transliterate,
  transliterateBulk,
} from '../utils/search/transliterate';

describe('transliteration utilities', () => {
  it('normalizes Cyrillic strings', () => {
    expect(normalizeForSearch('Москва')).toBe('moskva');
  });

  it('normalizes Greek strings with accents', () => {
    expect(normalizeForSearch('Αθήνα')).toBe('athina');
  });

  it('normalizes Hiragana strings', () => {
    expect(normalizeForSearch('かな')).toBe('kana');
  });

  it('removes common diacritics', () => {
    expect(normalizeForSearch('résumé')).toBe('resume');
  });

  it('matches transliterated queries across scripts', () => {
    const cases: Array<[string, string]> = [
      ['Москва', 'Moskva Terminal'],
      ['Αθήνα', 'Athina Security Suite'],
      ['サイバー', 'Saiba Lab'],
    ];
    for (const [query, target] of cases) {
      const normalizedQuery = normalizeForSearch(query);
      const normalizedTarget = normalizeForSearch(target);
      expect(normalizedQuery).not.toBe('');
      expect(normalizedTarget).not.toBe('');
      expect(matchesSearchQuery(query, target)).toBe(true);
    }
  });

  it('transliterates in bulk', async () => {
    await expect(transliterateBulk(['Москва', 'Αθήνα', 'かな'])).resolves.toEqual([
      'Moskva',
      'Athina',
      'kana',
    ]);
  });

  it('falls back to single transliteration', () => {
    expect(transliterate('ßecurity')).toBe('ssecurity');
  });
});
