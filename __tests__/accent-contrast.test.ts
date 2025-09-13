import { ensureContrast, contrastRatio } from '../hooks/useSettings';

describe('accent focus ring contrast', () => {
  test('ensures at least 4.5:1 against background', () => {
    const bg = '#0f1317';
    const accent = '#111315'; // low contrast against bg
    const adjusted = ensureContrast(accent, bg, 4.5);
    expect(contrastRatio(adjusted, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
