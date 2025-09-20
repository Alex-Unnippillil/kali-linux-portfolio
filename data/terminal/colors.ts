import { assertAccessibleAnsiRamp } from '../../utils/color/ansiContrast';

export type TerminalThemeVariant = 'dark' | 'light';

export interface TerminalColorVariant {
  readonly palette: readonly string[];
  readonly background: string;
  readonly foreground: string;
  readonly cursor: string;
  readonly selectionBackground: string;
}

export interface TerminalColorPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dark: TerminalColorVariant;
  readonly light: TerminalColorVariant;
}

const ensureRamp = (variant: TerminalColorVariant, label: string): void => {
  if (variant.palette.length !== 16) {
    throw new Error(`${label} must include 16 ANSI colors, received ${variant.palette.length}`);
  }
  assertAccessibleAnsiRamp(variant.palette, variant.background, {
    label,
    minContrast: 4.5,
  });
};

const kaliContrast: TerminalColorPreset = {
  id: 'kali-contrast',
  name: 'Kali Contrast',
  description: 'High-contrast remix of the Kali defaults tuned for AA text on dark or light surfaces.',
  dark: {
    background: '#0f1317',
    foreground: '#f4f6f9',
    cursor: '#1793d1',
    selectionBackground: 'rgba(23, 147, 209, 0.35)',
    palette: [
      '#7c8393',
      '#ff6b6b',
      '#8be38b',
      '#ffd86b',
      '#6ba7ff',
      '#d88bff',
      '#63e6e2',
      '#f4f6f9',
      '#aeb7c4',
      '#ff9393',
      '#aef3af',
      '#ffe7a3',
      '#96c7ff',
      '#e0adff',
      '#9af2f0',
      '#ffffff',
    ],
  },
  light: {
    background: '#f5f7fa',
    foreground: '#1b1f27',
    cursor: '#0c4fa3',
    selectionBackground: 'rgba(12, 79, 163, 0.2)',
    palette: [
      '#3f4754',
      '#b0182b',
      '#0d7a36',
      '#8a5a00',
      '#0c4fa3',
      '#7a1b87',
      '#006d78',
      '#1b1f27',
      '#505a6b',
      '#a71f35',
      '#0b6132',
      '#7a4100',
      '#0b4b9a',
      '#6f2180',
      '#00677a',
      '#1f2530',
    ],
  },
};

const cyberWave: TerminalColorPreset = {
  id: 'cyber-wave',
  name: 'Cyber Wave',
  description: 'Neon-forward palette with extremely bright primaries for command output legibility.',
  dark: {
    background: '#05070a',
    foreground: '#f0f3f7',
    cursor: '#4d8dff',
    selectionBackground: 'rgba(77, 141, 255, 0.35)',
    palette: [
      '#7f8696',
      '#ff5151',
      '#56f182',
      '#ffd347',
      '#4d8dff',
      '#ff7bff',
      '#41d9ff',
      '#f0f3f7',
      '#b8c1d0',
      '#ff8282',
      '#7cf6a3',
      '#ffe590',
      '#86b6ff',
      '#ffc4ff',
      '#7beaff',
      '#ffffff',
    ],
  },
  light: {
    background: '#f4f7fb',
    foreground: '#111926',
    cursor: '#0d52ba',
    selectionBackground: 'rgba(13, 82, 186, 0.18)',
    palette: [
      '#445061',
      '#b90f2b',
      '#037b3b',
      '#9a5f00',
      '#0d52ba',
      '#8a2396',
      '#0a6d83',
      '#111926',
      '#5b6678',
      '#d22d47',
      '#0a5c33',
      '#6b3600',
      '#0f61d6',
      '#9c2dab',
      '#005066',
      '#1b2735',
    ],
  },
};

const dawnPatrol: TerminalColorPreset = {
  id: 'dawn-patrol',
  name: 'Dawn Patrol',
  description: 'Balanced warm and cool tones inspired by early-morning reconnaissance dashboards.',
  dark: {
    background: '#111419',
    foreground: '#eef2f6',
    cursor: '#5fa8d3',
    selectionBackground: 'rgba(95, 168, 211, 0.32)',
    palette: [
      '#7d8696',
      '#f06543',
      '#8cd867',
      '#f4d35e',
      '#5fa8d3',
      '#b89bdc',
      '#4ecdc4',
      '#f7fff7',
      '#aeb7c9',
      '#ff8966',
      '#a2f58c',
      '#fbe7a1',
      '#90c9f8',
      '#cfb2f2',
      '#7cead9',
      '#ffffff',
    ],
  },
  light: {
    background: '#f6f8fb',
    foreground: '#1b222c',
    cursor: '#295e96',
    selectionBackground: 'rgba(31, 94, 158, 0.16)',
    palette: [
      '#46515f',
      '#a53a27',
      '#2b7d3d',
      '#9d6500',
      '#295e96',
      '#82429f',
      '#146f6b',
      '#1b222c',
      '#5c6878',
      '#b54932',
      '#256e3d',
      '#8b4a00',
      '#1f5e9e',
      '#753989',
      '#145e66',
      '#27313f',
    ],
  },
};

export const terminalColorPresets: TerminalColorPreset[] = [
  kaliContrast,
  cyberWave,
  dawnPatrol,
];

export const DEFAULT_TERMINAL_PRESET_ID = terminalColorPresets[0].id;

for (const preset of terminalColorPresets) {
  ensureRamp(preset.dark, `${preset.name} (dark)`);
  ensureRamp(preset.light, `${preset.name} (light)`);
}

export type TerminalPresetId = (typeof terminalColorPresets)[number]['id'];
