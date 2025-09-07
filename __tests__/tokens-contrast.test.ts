import fs from 'fs';
import path from 'path';
import { contrastRatio } from '../components/apps/Games/common/theme';

const tokensPath = path.join(__dirname, '..', 'styles', 'tokens.css');
const css = fs.readFileSync(tokensPath, 'utf8');

const getVar = (name: string): string => {
  const regex = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`);
  const match = css.match(regex);
  if (!match) throw new Error(`Token ${name} not found`);
  return match[1];
};

describe('design token contrast', () => {
  const pairs: [string, string][] = [
    ['--color-text', '--color-bg'],
    ['--color-ubt-grey', '--color-ub-grey'],
    ['--color-ubt-warm-grey', '--color-ub-warm-grey'],
    ['--color-ubt-cool-grey', '--color-ub-cool-grey'],
  ];

  pairs.forEach(([fgVar, bgVar]) => {
    test(`${fgVar} on ${bgVar} meets WCAG AA`, () => {
      const fg = getVar(fgVar);
      const bg = getVar(bgVar);
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
