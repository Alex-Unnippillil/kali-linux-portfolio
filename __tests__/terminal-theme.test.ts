import {
  PALETTES,
  getTerminalPalette,
  setTerminalPalette,
  TERMINAL_PALETTE_KEY,
} from '../components/apps/Terminal/theme';
import { contrastRatio } from '../components/apps/Games/common/theme';

describe('terminal theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('accessible palette has high foreground/background contrast', () => {
    const theme = PALETTES.accessible;
    expect(contrastRatio(theme.foreground, theme.background)).toBeGreaterThanOrEqual(7);
  });

  test('persists selected palette', () => {
    setTerminalPalette('highContrast');
    expect(getTerminalPalette()).toEqual(PALETTES.highContrast);
    expect(window.localStorage.getItem(TERMINAL_PALETTE_KEY)).toBe('highContrast');
  });
});
