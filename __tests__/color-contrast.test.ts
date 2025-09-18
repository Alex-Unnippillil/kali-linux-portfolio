import {
  contrastPairs,
  contrastRatio,
  semanticPalette,
  meetsContrastRequirement,
} from '../styles/colors';

describe('semantic color palette contrast', () => {
  it.each(contrastPairs.map((pair) => [pair.name, pair]))(
    '%s maintains at least WCAG AA contrast',
    (_, pair) => {
      expect(meetsContrastRequirement(pair)).toBe(true);
    },
  );

  it('button hover state remains accessible', () => {
    const ratio = contrastRatio(
      semanticPalette.buttons.primary.foreground,
      semanticPalette.buttons.primary.hover,
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('window chrome contrast exceeds requirement for desktop chrome', () => {
    const { windowChrome } = semanticPalette.surfaces;
    expect(contrastRatio(windowChrome.foreground, windowChrome.background)).toBeGreaterThanOrEqual(4.5);
  });
});
