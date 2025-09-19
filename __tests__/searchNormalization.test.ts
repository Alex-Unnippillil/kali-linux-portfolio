import { normalizeForSearch } from '../utils/search';

describe('normalizeForSearch', () => {
  it('removes diacritics and lowercases text', () => {
    expect(normalizeForSearch('Déjà Vu')).toBe('deja vu');
  });

  it('collapses whitespace and punctuation', () => {
    expect(normalizeForSearch('  Kali-Linux\tPortfolio ')).toBe('kali linux portfolio');
  });

  it('converts ligatures and special characters', () => {
    expect(normalizeForSearch('Crème brûlée & Æther ß')).toBe('creme brulee aether ss');
  });
});
