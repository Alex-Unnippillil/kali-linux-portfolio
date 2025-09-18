import { contrastRatio, validateAnsiRamp } from '../utils/color/ansiContrast';
import { terminalColorPresets } from '../data/terminal/colors';

describe('ansiContrast utilities', () => {
  it('computes expected WCAG contrast ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2);
    expect(contrastRatio('#ff0000', '#00ff00')).toBeCloseTo(2.91, 2);
  });

  it('identifies palette entries below the minimum contrast threshold', () => {
    const failures = validateAnsiRamp(['#111111'], '#000000', 4.5);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ index: 0, color: '#111111' });
  });

  it('ensures bundled terminal presets meet contrast requirements', () => {
    for (const preset of terminalColorPresets) {
      expect(preset.dark.palette).toHaveLength(16);
      expect(preset.light.palette).toHaveLength(16);
      expect(validateAnsiRamp(preset.dark.palette, preset.dark.background, 4.5)).toHaveLength(0);
      expect(validateAnsiRamp(preset.light.palette, preset.light.background, 4.5)).toHaveLength(0);
    }
  });
});
