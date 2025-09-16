import fs from 'fs';
import path from 'path';
import { contrastRatio } from '../components/apps/Games/common/theme';

type TokenMap = Record<string, string>;

const loadHighContrastTokens = (): TokenMap => {
  const file = path.join(__dirname, '..', 'styles', 'tokens.css');
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/\.high-contrast\s*\{([\s\S]*?)\n\}/);
  if (!match) throw new Error('Unable to locate .high-contrast token block');
  const body = match[1];
  const tokens: TokenMap = {};
  body
    .split('\n')
    .map((line) => line.trim())
    .forEach((line) => {
      const tokenMatch = line.match(/^(--[a-z0-9-]+):\s*([^;]+);/i);
      if (tokenMatch) {
        const [, name, value] = tokenMatch;
        tokens[name] = value.trim();
      }
    });
  return tokens;
};

describe('high contrast tokens', () => {
  const tokens = loadHighContrastTokens();
  const resolve = (value: string): string => {
    if (value.startsWith('--')) {
      const resolved = tokens[value];
      if (!resolved) throw new Error(`Missing token ${value}`);
      return resolved;
    }
    return value;
  };

  const combos: Array<{ fg: string; bg: string; min: number; label: string }> = [
    { fg: '--color-text', bg: '--color-bg', min: 7, label: 'text on base background' },
    { fg: '--color-text', bg: '--color-ub-grey', min: 7, label: 'text on primary surface' },
    { fg: '--color-text', bg: '--color-ub-cool-grey', min: 7, label: 'text on cool grey surface' },
    { fg: '--color-text', bg: '--color-ub-dark-grey', min: 7, label: 'text on dark grey surface' },
    { fg: '--color-text', bg: '--color-ub-gedit-dark', min: 7, label: 'text on gedit workspace' },
    { fg: '#ffffff', bg: '--color-ub-orange', min: 4.5, label: 'white on accent orange' },
    { fg: '#000000', bg: '--color-ub-orange', min: 4.5, label: 'black on accent orange' },
    { fg: '#ffffff', bg: '--color-ubt-blue', min: 4.5, label: 'white on utility blue' },
    { fg: '#000000', bg: '--color-ubt-blue', min: 4.5, label: 'black on utility blue' },
    { fg: '#ffffff', bg: '--color-ubt-green', min: 4.5, label: 'white on utility green' },
    { fg: '#000000', bg: '--color-ubt-green', min: 4.5, label: 'black on utility green' },
    { fg: '#ffffff', bg: '--color-ubt-gedit-orange', min: 4.5, label: 'white on gedit orange' },
    { fg: '#000000', bg: '--color-ubt-gedit-orange', min: 4.5, label: 'black on gedit orange' },
    { fg: '#ffffff', bg: '--color-ubt-gedit-blue', min: 4.5, label: 'white on gedit blue' },
    { fg: '#000000', bg: '--color-ubt-gedit-blue', min: 4.5, label: 'black on gedit blue' },
    { fg: '--color-ubt-gedit-blue', bg: '--color-ub-gedit-dark', min: 4.5, label: 'gedit blue labels' },
    { fg: '--color-ubt-gedit-orange', bg: '--color-ub-gedit-dark', min: 4.5, label: 'gedit orange labels' },
    { fg: '#ffffff', bg: '--color-ubt-cool-grey', min: 4.5, label: 'white on utility cool grey' },
    { fg: '#000000', bg: '--color-ubt-cool-grey', min: 4.5, label: 'black on utility cool grey' },
    { fg: '#ffffff', bg: '--game-color-secondary', min: 4.5, label: 'white on game secondary' },
    { fg: '#000000', bg: '--game-color-secondary', min: 4.5, label: 'black on game secondary' },
    { fg: '#ffffff', bg: '--game-color-success', min: 4.5, label: 'white on game success' },
    { fg: '#000000', bg: '--game-color-success', min: 4.5, label: 'black on game success' },
    { fg: '#ffffff', bg: '--game-color-warning', min: 4.5, label: 'white on game warning' },
    { fg: '#000000', bg: '--game-color-warning', min: 4.5, label: 'black on game warning' },
    { fg: '#ffffff', bg: '--game-color-danger', min: 4.5, label: 'white on game danger' },
    { fg: '#000000', bg: '--game-color-danger', min: 4.5, label: 'black on game danger' },
    { fg: '--focus-outline-color', bg: '--color-bg', min: 4.5, label: 'focus outline against background' },
  ];

  test('meet contrast requirements', () => {
    combos.forEach(({ fg, bg, min, label }) => {
      const fgColor = resolve(fg);
      const bgColor = resolve(bg);
      expect(fgColor).toBeDefined();
      expect(bgColor).toBeDefined();
      const ratio = contrastRatio(fgColor, bgColor);
      if (ratio < min) {
        throw new Error(
          `Contrast for ${label} (${fgColor} on ${bgColor}) was ${ratio.toFixed(2)}, expected ≥ ${min}`,
        );
      }
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  });
});
