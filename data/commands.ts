import apps from '../apps.config';
import { ACCENT_OPTIONS } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

export const FONT_SCALE_MIN = 0.75;
export const FONT_SCALE_MAX = 1.5;
export const FONT_SCALE_STEP = 0.05;

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
};

export type ToggleSettingKey =
  | 'reducedMotion'
  | 'highContrast'
  | 'largeHitAreas'
  | 'allowNetwork'
  | 'haptics'
  | 'pongSpin';

export type SelectSettingKey = 'density' | 'theme' | 'accent' | 'wallpaper';
export type NumericSettingKey = 'fontScale';
export type SettingKey = SelectSettingKey | NumericSettingKey;

export type CommandAction =
  | { type: 'open-app'; appId: string }
  | { type: 'toggle-setting'; setting: ToggleSettingKey }
  | { type: 'set-setting'; setting: SettingKey; value: string | number | boolean }
  | { type: 'adjust-font'; delta: number };

export type CommandDefinition = {
  id: string;
  title: string;
  section: string;
  subtitle?: string | ((context: CommandRuntimeContext) => string);
  keywords?: string[];
  icon?: string;
  action: CommandAction;
  hidden?: (context: CommandRuntimeContext) => boolean;
};

export type CommandSettingsState = {
  accent: string;
  wallpaper: string;
  density: 'regular' | 'compact';
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
};

export type CommandRuntimeContext = {
  settings: CommandSettingsState;
};

export type ResolvedCommand = Omit<CommandDefinition, 'subtitle' | 'hidden'> & {
  subtitle?: string;
};

export type PreparedCommand = ResolvedCommand & {
  normalizedTitle: string;
  normalizedSubtitle: string;
  normalizedSection: string;
  normalizedKeywords: string[];
};

const accentNames = ['Kali Blue', 'Red', 'Orange', 'Green', 'Purple', 'Pink'];
const accentLabels: Record<string, string> = ACCENT_OPTIONS.reduce((acc, value, index) => {
  acc[value] = accentNames[index] ?? value;
  return acc;
}, {} as Record<string, string>);

const themeOptions = [
  { value: 'default', label: 'Default theme', keywords: ['light', 'standard'] },
  { value: 'dark', label: 'Dark theme', keywords: ['night', 'dark mode'] },
  { value: 'neon', label: 'Neon theme', keywords: ['vibrant', 'bright'] },
  { value: 'matrix', label: 'Matrix theme', keywords: ['terminal', 'green'] },
];

const densityOptions = [
  { value: 'regular', label: 'Regular density', description: 'Comfortable spacing' },
  { value: 'compact', label: 'Compact density', description: 'Tighter spacing' },
];

export const normalizeText = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const computeFuzzyScore = (source: string, query: string): number => {
  if (!source || !query) return 0;

  let score = 0;
  let lastIndex = -1;

  for (let i = 0; i < query.length; i += 1) {
    const char = query[i];
    const index = source.indexOf(char, lastIndex + 1);
    if (index === -1) {
      return 0;
    }

    if (lastIndex === -1) {
      score += Math.max(8 - index, 1);
    } else if (index === lastIndex + 1) {
      score += 6;
    } else {
      const gap = index - lastIndex - 1;
      score += Math.max(4 - Math.min(gap, 4), 1);
    }

    if (index === i) {
      score += 2;
    }

    lastIndex = index;
  }

  if (source.startsWith(query)) {
    score += 12;
  }
  if (source.includes(` ${query}`)) {
    score += 8;
  } else if (source.includes(query)) {
    score += 4;
  }

  return score + query.length;
};

export const prepareCommands = (definitions: ResolvedCommand[]): PreparedCommand[] =>
  definitions.map((definition) => ({
    ...definition,
    normalizedTitle: normalizeText(definition.title),
    normalizedSubtitle: normalizeText(definition.subtitle),
    normalizedSection: normalizeText(definition.section),
    normalizedKeywords: (definition.keywords ?? []).map(normalizeText),
  }));

export const fuzzySearchCommands = (
  query: string,
  commands: PreparedCommand[],
): PreparedCommand[] => {
  const trimmed = normalizeText(query);
  if (!trimmed) {
    return commands;
  }

  const terms = trimmed.split(' ').filter(Boolean);
  if (!terms.length) {
    return commands;
  }

  const scored: { command: PreparedCommand; score: number }[] = [];

  for (const command of commands) {
    let totalScore = 0;
    let matchesAll = true;

    for (const term of terms) {
      const titleScore = computeFuzzyScore(command.normalizedTitle, term);
      const keywordScore = command.normalizedKeywords.reduce(
        (best, keyword) => Math.max(best, computeFuzzyScore(keyword, term)),
        0,
      );
      const subtitleScore = computeFuzzyScore(command.normalizedSubtitle, term);
      const sectionScore = computeFuzzyScore(command.normalizedSection, term);

      const termScore = Math.max(
        titleScore * 4,
        keywordScore * 3,
        subtitleScore * 2,
        sectionScore,
      );

      if (termScore <= 0) {
        matchesAll = false;
        break;
      }

      totalScore += termScore;
    }

    if (matchesAll) {
      if (command.section === 'Applications') {
        totalScore += 5;
      }
      scored.push({ command, score: totalScore });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.command.title.localeCompare(b.command.title);
  });

  return scored.map((item) => item.command);
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const toggleCommands: CommandDefinition[] = [
  {
    id: 'toggle-reduced-motion',
    title: 'Toggle reduced motion',
    section: 'Accessibility',
    keywords: ['animation', 'motion', 'accessibility', 'reduce'],
    subtitle: ({ settings }) => (settings.reducedMotion ? 'Enabled' : 'Disabled'),
    action: { type: 'toggle-setting', setting: 'reducedMotion' },
  },
  {
    id: 'toggle-high-contrast',
    title: 'Toggle high contrast',
    section: 'Accessibility',
    keywords: ['contrast', 'accessibility', 'vision'],
    subtitle: ({ settings }) => (settings.highContrast ? 'Enabled' : 'Disabled'),
    action: { type: 'toggle-setting', setting: 'highContrast' },
  },
  {
    id: 'toggle-large-hit-areas',
    title: 'Toggle large hit areas',
    section: 'Accessibility',
    keywords: ['touch', 'accessibility', 'inputs'],
    subtitle: ({ settings }) => (settings.largeHitAreas ? 'Enabled' : 'Disabled'),
    action: { type: 'toggle-setting', setting: 'largeHitAreas' },
  },
  {
    id: 'toggle-haptics',
    title: 'Toggle haptics',
    section: 'System',
    keywords: ['feedback', 'vibration', 'sound'],
    subtitle: ({ settings }) => (settings.haptics ? 'Enabled' : 'Disabled'),
    action: { type: 'toggle-setting', setting: 'haptics' },
  },
  {
    id: 'toggle-allow-network',
    title: 'Toggle network requests',
    section: 'System',
    keywords: ['network', 'privacy', 'requests', 'offline'],
    subtitle: ({ settings }) => (settings.allowNetwork ? 'Allowed' : 'Blocked'),
    action: { type: 'toggle-setting', setting: 'allowNetwork' },
  },
  {
    id: 'toggle-pong-spin',
    title: 'Toggle Pong spin',
    section: 'System',
    keywords: ['game', 'pong', 'spin'],
    subtitle: ({ settings }) => (settings.pongSpin ? 'Enabled' : 'Disabled'),
    action: { type: 'toggle-setting', setting: 'pongSpin' },
  },
];

const fontCommands: CommandDefinition[] = [
  {
    id: 'font-increase',
    title: 'Increase font size',
    section: 'Appearance',
    keywords: ['font', 'text', 'larger', 'zoom in'],
    subtitle: ({ settings }) =>
      settings.fontScale >= FONT_SCALE_MAX
        ? `Current ${formatPercent(settings.fontScale)} (max)`
        : `Current ${formatPercent(settings.fontScale)}`,
    action: { type: 'adjust-font', delta: FONT_SCALE_STEP },
  },
  {
    id: 'font-decrease',
    title: 'Decrease font size',
    section: 'Appearance',
    keywords: ['font', 'text', 'smaller', 'zoom out'],
    subtitle: ({ settings }) =>
      settings.fontScale <= FONT_SCALE_MIN
        ? `Current ${formatPercent(settings.fontScale)} (min)`
        : `Current ${formatPercent(settings.fontScale)}`,
    action: { type: 'adjust-font', delta: -FONT_SCALE_STEP },
  },
  {
    id: 'font-reset',
    title: 'Reset font size',
    section: 'Appearance',
    keywords: ['font', 'text', 'reset', 'default'],
    subtitle: ({ settings }) =>
      settings.fontScale === defaults.fontScale
        ? 'Already at default size'
        : `Current ${formatPercent(settings.fontScale)} → ${formatPercent(defaults.fontScale)}`,
    action: { type: 'set-setting', setting: 'fontScale', value: defaults.fontScale },
  },
];

const themeCommands: CommandDefinition[] = themeOptions.map((theme) => ({
  id: `set-theme-${theme.value}`,
  title: theme.label,
  section: 'Appearance',
  keywords: ['theme', theme.value, ...(theme.keywords ?? [])],
  subtitle: ({ settings }) =>
    settings.theme === theme.value ? 'Current theme' : `Switch to ${theme.label}`,
  action: { type: 'set-setting', setting: 'theme', value: theme.value },
}));

const densityCommands: CommandDefinition[] = densityOptions.map((density) => ({
  id: `set-density-${density.value}`,
  title: density.label,
  section: 'Appearance',
  keywords: ['density', density.value, 'spacing'],
  subtitle: ({ settings }) =>
    settings.density === density.value
      ? 'Current layout density'
      : `Switch to ${density.description}`,
  action: { type: 'set-setting', setting: 'density', value: density.value },
}));

const accentCommands: CommandDefinition[] = ACCENT_OPTIONS.map((accent) => {
  const label = accentLabels[accent] ?? accent;
  return {
    id: `set-accent-${accent.replace('#', '')}`,
    title: `Accent color: ${label}`,
    section: 'Appearance',
    keywords: ['accent', 'color', accent.replace('#', ''), label.toLowerCase()],
    subtitle: ({ settings }) =>
      settings.accent === accent ? 'Current accent color' : `Switch to ${label}`,
    action: { type: 'set-setting', setting: 'accent', value: accent },
  };
});

const appCommands: CommandDefinition[] = (apps as AppMeta[])
  .filter((app) => !app.disabled)
  .map((app) => ({
    id: `open-app-${app.id}`,
    title: app.title,
    section: 'Applications',
    subtitle: 'Open application',
    keywords: [app.id, 'app', 'open', 'launch'],
    icon: app.icon,
    action: { type: 'open-app', appId: app.id },
  }));

const commandDefinitions: CommandDefinition[] = [
  ...appCommands,
  ...toggleCommands,
  ...fontCommands,
  ...themeCommands,
  ...densityCommands,
  ...accentCommands,
];

export function resolveCommands(context: CommandRuntimeContext): ResolvedCommand[] {
  return commandDefinitions
    .filter((definition) => (definition.hidden ? !definition.hidden(context) : true))
    .map((definition) => ({
      id: definition.id,
      title: definition.title,
      section: definition.section,
      keywords: definition.keywords,
      icon: definition.icon,
      action: definition.action,
      subtitle:
        typeof definition.subtitle === 'function'
          ? definition.subtitle(context)
          : definition.subtitle,
    }));
}

