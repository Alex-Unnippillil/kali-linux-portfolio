import { contrastRatio } from '../components/apps/Games/common/theme';
import {
  BUILT_IN_THEME_MAP,
  BUILT_IN_THEMES,
  ThemeDefinition,
  ThemeColorTokens,
  ThemeTypographyTokens,
} from '../styles/themes';

const CUSTOM_THEME_STORAGE_KEY = 'app:themes';

export interface ContrastWarning {
  pair: string;
  value: number;
  minimum: number;
}

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  contrastWarnings: ContrastWarning[];
}

const COLOR_KEYS: (keyof ThemeColorTokens)[] = [
  'background',
  'surface',
  'surfaceAlt',
  'muted',
  'text',
  'textMuted',
  'accent',
  'accentMuted',
  'accentContrast',
  'border',
  'borderStrong',
  'focus',
  'selection',
  'success',
  'warning',
  'danger',
  'info',
  'terminal',
];

const TYPOGRAPHY_KEYS: (keyof ThemeTypographyTokens)[] = [
  'fontFamily',
  'headingFamily',
  'monospaceFamily',
  'baseFontSize',
  'lineHeight',
  'letterSpacing',
];

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const THEME_ID_REGEX = /^[a-z0-9-]+$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* swallow storage errors */
  }
};

export const shadeColor = (color: string, percent: number): string => {
  const normalized = color.startsWith('#') ? color.slice(1) : color;
  const base = parseInt(normalized, 16);
  const target = percent < 0 ? 0 : 255;
  const ratio = Math.abs(percent);
  const r = base >> 16;
  const g = (base >> 8) & 0x00ff;
  const b = base & 0x0000ff;
  const mix = (channel: number) => Math.round((target - channel) * ratio) + channel;
  const [nr, ng, nb] = [r, g, b].map(mix);
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
};

const COLOR_VARIABLE_MAP: Record<keyof ThemeColorTokens, string[]> = {
  background: ['--color-bg', '--color-ub-grey', '--kali-bg'],
  surface: ['--color-surface', '--color-ub-cool-grey', '--color-ub-lite-abrgn'],
  surfaceAlt: ['--color-ub-dark-grey'],
  muted: ['--color-muted'],
  text: ['--color-text', '--color-ubt-grey'],
  textMuted: ['--color-ubt-cool-grey', '--color-ubt-warm-grey', '--color-ub-warm-grey'],
  accent: [],
  accentMuted: ['--color-secondary', '--color-ub-gedit-dark'],
  accentContrast: ['--color-inverse'],
  border: ['--color-border'],
  borderStrong: [],
  focus: ['--focus-outline-color'],
  selection: [],
  success: ['--game-color-success', '--color-ubt-green'],
  warning: ['--game-color-warning', '--color-ubt-gedit-orange'],
  danger: ['--game-color-danger'],
  info: ['--game-color-secondary', '--color-ubt-blue', '--color-ubt-gedit-blue'],
  terminal: ['--color-terminal'],
};

const TYPOGRAPHY_VARIABLE_MAP: Record<keyof ThemeTypographyTokens, string> = {
  fontFamily: '--font-family-base',
  headingFamily: '--font-family-heading',
  monospaceFamily: '--font-family-mono',
  baseFontSize: '--theme-font-size',
  lineHeight: '--theme-line-height',
  letterSpacing: '--theme-letter-spacing',
};

export const applyAccentColor = (accent: string): void => {
  if (typeof document === 'undefined') return;
  const border = shadeColor(accent, -0.2);
  const vars: Record<string, string> = {
    '--color-ub-orange': accent,
    '--color-ub-border-orange': border,
    '--color-primary': accent,
    '--color-accent': accent,
    '--color-control-accent': accent,
    '--color-focus-ring': accent,
    '--color-selection': accent,
  };
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  document.documentElement.style.setProperty('accent-color', accent);
};

export const applyThemeTokens = (
  theme: ThemeDefinition,
  options: { includeAccent?: boolean } = {},
): void => {
  if (typeof document === 'undefined') return;
  const { includeAccent = false } = options;
  document.documentElement.dataset.theme = theme.metadata.id;
  document.documentElement.classList.toggle('dark', theme.metadata.mode === 'dark');

  Object.entries(COLOR_VARIABLE_MAP).forEach(([token, variables]) => {
    const value = theme.colors[token as keyof ThemeColorTokens];
    variables.forEach((cssVar) => {
      document.documentElement.style.setProperty(cssVar, value);
    });
  });

  Object.entries(TYPOGRAPHY_VARIABLE_MAP).forEach(([token, variable]) => {
    const value = theme.typography[token as keyof ThemeTypographyTokens];
    document.documentElement.style.setProperty(variable, String(value));
  });

  if (includeAccent) {
    applyAccentColor(theme.colors.accent);
  }
};

export const getContrastWarnings = (theme: ThemeDefinition): ContrastWarning[] => {
  const warnings: ContrastWarning[] = [];
  const bodyContrast = contrastRatio(theme.colors.text, theme.colors.background);
  if (bodyContrast < 4.5) {
    warnings.push({ pair: 'text/background', value: bodyContrast, minimum: 4.5 });
  }

  const surfaceContrast = contrastRatio(theme.colors.text, theme.colors.surface);
  if (surfaceContrast < 4.5) {
    warnings.push({ pair: 'text/surface', value: surfaceContrast, minimum: 4.5 });
  }

  const mutedContrast = contrastRatio(theme.colors.textMuted, theme.colors.background);
  if (mutedContrast < 3) {
    warnings.push({ pair: 'muted text/background', value: mutedContrast, minimum: 3 });
  }

  const accentBgContrast = contrastRatio(
    theme.colors.accent,
    theme.colors.background,
  );
  if (accentBgContrast < 3) {
    warnings.push({ pair: 'accent/background', value: accentBgContrast, minimum: 3 });
  }

  const accentTextContrast = contrastRatio(
    theme.colors.accentContrast,
    theme.colors.accent,
  );
  if (accentTextContrast < 3) {
    warnings.push({ pair: 'accent contrast/accent', value: accentTextContrast, minimum: 3 });
  }

  return warnings;
};

export const validateThemeDefinition = (theme: unknown): ThemeValidationResult => {
  const errors: string[] = [];
  const contrastWarnings: ContrastWarning[] = [];

  if (!isRecord(theme)) {
    return { valid: false, errors: ['Theme data must be an object.'], contrastWarnings };
  }

  const metadata = theme.metadata;
  if (!isRecord(metadata)) {
    errors.push('Theme metadata is missing.');
  } else {
    if (typeof metadata.id !== 'string' || !metadata.id.trim()) {
      errors.push('Theme metadata.id is required.');
    } else if (!THEME_ID_REGEX.test(metadata.id)) {
      errors.push('Theme id must use alphanumeric or dash characters.');
    }
    if (typeof metadata.name !== 'string' || !metadata.name.trim()) {
      errors.push('Theme metadata.name is required.');
    }
    if (typeof metadata.version !== 'string' || !metadata.version.trim()) {
      errors.push('Theme metadata.version is required.');
    }
    if (metadata.mode !== 'light' && metadata.mode !== 'dark') {
      errors.push('Theme metadata.mode must be "light" or "dark".');
    }
    if (!isRecord(metadata.attribution)) {
      errors.push('Theme metadata.attribution is required.');
    } else if (
      typeof metadata.attribution.author !== 'string' ||
      !metadata.attribution.author.trim()
    ) {
      errors.push('Theme attribution author is required.');
    }
    if (BUILT_IN_THEME_MAP[metadata.id]) {
      errors.push('Theme id conflicts with a built-in theme. Choose another id.');
    }
  }

  const colors = theme.colors;
  if (!isRecord(colors)) {
    errors.push('Theme colors are missing.');
  } else {
    for (const key of COLOR_KEYS) {
      const value = colors[key];
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`Theme colors.${key} is required.`);
      } else if (!HEX_COLOR_REGEX.test(value.trim())) {
        errors.push(`Theme colors.${key} must be a hex color value.`);
      }
    }
  }

  const typography = theme.typography;
  if (!isRecord(typography)) {
    errors.push('Theme typography is missing.');
  } else {
    for (const key of TYPOGRAPHY_KEYS) {
      const value = typography[key];
      if (key === 'lineHeight') {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push('Theme typography.lineHeight must be a number.');
        }
      } else if (typeof value !== 'string' || !value.trim()) {
        errors.push(`Theme typography.${key} is required.`);
      }
    }
  }

  if (errors.length === 0) {
    const definition = theme as ThemeDefinition;
    contrastWarnings.push(...getContrastWarnings(definition));
  }

  if (contrastWarnings.length > 0) {
    contrastWarnings.forEach((warning) => {
      errors.push(
        `Contrast warning for ${warning.pair}: ${warning.value.toFixed(2)} (requires ≥ ${warning.minimum.toFixed(2)}).`,
      );
    });
    errors.push(
      'Theme contrast requirements failed. Adjust colors to meet WCAG thresholds.',
    );
  }

  return { valid: errors.length === 0, errors, contrastWarnings };
};

export const getCustomThemes = (): ThemeDefinition[] => {
  const raw = readLocalStorage(CUSTOM_THEME_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid: ThemeDefinition[] = [];
    parsed.forEach((item) => {
      const result = validateThemeDefinition(item);
      if (result.valid) {
        valid.push(item as ThemeDefinition);
      }
    });
    return valid;
  } catch {
    return [];
  }
};

export const saveCustomThemes = (themes: ThemeDefinition[]): void => {
  writeLocalStorage(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(themes));
};

export const upsertCustomTheme = (theme: ThemeDefinition): ThemeDefinition[] => {
  const themes = getCustomThemes();
  const filtered = themes.filter((item) => item.metadata.id !== theme.metadata.id);
  filtered.push(theme);
  saveCustomThemes(filtered);
  return filtered;
};

export const removeCustomTheme = (id: string): ThemeDefinition[] => {
  const themes = getCustomThemes().filter((theme) => theme.metadata.id !== id);
  saveCustomThemes(themes);
  return themes;
};

export const getThemeDefinition = (id: string): ThemeDefinition | undefined => {
  const builtIn = BUILT_IN_THEME_MAP[id];
  if (builtIn) return builtIn;
  const custom = getCustomThemes().find((theme) => theme.metadata.id === id);
  return custom;
};

export const getAllThemes = (): ThemeDefinition[] => [
  ...BUILT_IN_THEMES,
  ...getCustomThemes(),
];
