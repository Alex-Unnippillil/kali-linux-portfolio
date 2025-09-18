import { ThemeDefinition } from './types';

export const defaultTheme: ThemeDefinition = {
  metadata: {
    id: 'default',
    name: 'Kali Nightfall',
    description: 'Default Kali Linux inspired desktop with cool navy surfaces and electric blue highlights.',
    version: '1.0.0',
    mode: 'dark',
    tags: ['official', 'kali', 'dark'],
    createdAt: '2024-01-01T00:00:00.000Z',
    attribution: {
      author: 'Alex Unnippillil',
      url: 'https://unnippillil.com',
      source: 'Kali Linux brand palette',
      license: 'CC BY-SA 4.0',
    },
  },
  colors: {
    background: '#0f1317',
    surface: '#1a1f26',
    surfaceAlt: '#13171b',
    muted: '#2a2e36',
    text: '#f5f5f5',
    textMuted: '#b1b7bd',
    accent: '#1793d1',
    accentMuted: '#0f6fa0',
    accentContrast: '#ffffff',
    border: '#2a2e36',
    borderStrong: '#0f6fa0',
    focus: '#1793d1',
    selection: '#1793d1',
    success: '#15803d',
    warning: '#d97706',
    danger: '#b91c1c',
    info: '#62a0ea',
    terminal: '#00ff00',
  },
  typography: {
    fontFamily: "'Ubuntu', sans-serif",
    headingFamily: "'Ubuntu', sans-serif",
    monospaceFamily: "'Fira Code', 'Ubuntu Mono', monospace",
    baseFontSize: '16px',
    lineHeight: 1.5,
    letterSpacing: '0em',
  },
};

export const kaliTheme = defaultTheme;
