import { gradientFromColor } from '../lib/wallpaper';
import { contrastRatio } from '../components/apps/Games/common/theme';

const extractHex = (gradient: string): string => {
  const match = gradient.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error('no color');
  const [r, g, b] = match.slice(1).map(Number);
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

describe('wallpaper gradient mask', () => {
  test('provides contrast for light images', () => {
    const grad = gradientFromColor('#f5f5f5');
    const color = extractHex(grad);
    expect(contrastRatio('#ffffff', color)).toBeGreaterThanOrEqual(4.5);
  });

  test('retains contrast for dark images', () => {
    const grad = gradientFromColor('#222222');
    const color = extractHex(grad);
    expect(contrastRatio('#ffffff', color)).toBeGreaterThanOrEqual(4.5);
  });
});
