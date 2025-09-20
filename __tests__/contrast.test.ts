import { contrastRatio, pickTextColor, meetsContrast } from '../utils/color/contrast';

describe('contrast helpers', () => {
  it('calculates contrast ratio between black and white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('detects WCAG compliance', () => {
    expect(meetsContrast('#000000', '#ffffff')).toBe(true);
    expect(meetsContrast('#777777', '#888888')).toBe(false);
  });

  it('picks accessible text color for bright and dark backgrounds', () => {
    const darkBackground = pickTextColor('#111111');
    expect(darkBackground.color).toBe('#ffffff');
    expect(darkBackground.isAccessible).toBe(true);

    const lightBackground = pickTextColor('#f5f5f5');
    expect(lightBackground.color).toBe('#000000');
    expect(lightBackground.isAccessible).toBe(true);
  });
});
