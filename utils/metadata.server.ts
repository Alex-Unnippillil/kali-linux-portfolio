import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ACCENT_COLOR_VARIABLE,
  FALLBACK_THEME_COLOR,
} from './metadata';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createCssVariableRegex = (variable: string): RegExp =>
  new RegExp(`${escapeRegExp(variable)}\\s*:\\s*([^;]+);`);

const CSS_SOURCES = [
  join(process.cwd(), 'styles', 'globals.css'),
  join(process.cwd(), 'styles', 'tokens.css'),
];

const ACCENT_REGEX = createCssVariableRegex(ACCENT_COLOR_VARIABLE);

export const readAccentColorFromStyles = (): string => {
  for (const file of CSS_SOURCES) {
    try {
      const css = readFileSync(file, 'utf8');
      const match = css.match(ACCENT_REGEX);
      if (match?.[1]) return match[1].trim();
    } catch {
      /* ignore missing styles */
    }
  }
  return FALLBACK_THEME_COLOR;
};

export default readAccentColorFromStyles;
