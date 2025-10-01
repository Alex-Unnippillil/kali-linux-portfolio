import { getNearestAccessibleColor, contrastRatio } from '../utils/colorAccessibility';

describe('getNearestAccessibleColor', () => {
  it('returns the original color when contrast already meets requirements', () => {
    const color = '#0b3d91';
    const text = '#ffffff';
    const result = getNearestAccessibleColor(color, text, 4.5);

    expect(result).toBe(color);
    expect(contrastRatio(result, text)).toBeGreaterThanOrEqual(4.5);
  });

  it('darkens a light color to meet contrast against white text', () => {
    const color = '#f0f0f0';
    const text = '#ffffff';

    expect(contrastRatio(color, text)).toBeLessThan(4.5);

    const adjusted = getNearestAccessibleColor(color, text, 4.5);

    expect(adjusted).not.toBe(color);
    expect(contrastRatio(adjusted, text)).toBeGreaterThanOrEqual(4.5);
  });

  it('lightens a dark color to meet contrast against black text', () => {
    const color = '#333333';
    const text = '#000000';

    expect(contrastRatio(color, text)).toBeLessThan(4.5);

    const adjusted = getNearestAccessibleColor(color, text, 4.5);

    expect(adjusted).not.toBe(color);
    expect(contrastRatio(adjusted, text)).toBeGreaterThanOrEqual(4.5);
  });
});
