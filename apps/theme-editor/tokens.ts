export type ThemeToken = {
  id: string;
  label: string;
  cssVar: `--${string}`;
  defaultValue: string;
  description: string;
  category: 'Core' | 'Surfaces' | 'State';
  tailwindKey?: string;
};

export const THEME_TOKENS: ThemeToken[] = [
  {
    id: 'background',
    label: 'Background',
    cssVar: '--color-bg',
    defaultValue: '#0f1317',
    description: 'Primary window and desktop background color.',
    category: 'Core',
    tailwindKey: 'background',
  },
  {
    id: 'text',
    label: 'Text',
    cssVar: '--color-text',
    defaultValue: '#f5f5f5',
    description: 'Default text color for dark backgrounds.',
    category: 'Core',
    tailwindKey: 'text',
  },
  {
    id: 'primary',
    label: 'Primary Accent',
    cssVar: '--color-primary',
    defaultValue: '#1793d1',
    description: 'Primary accent color for highlights and CTAs.',
    category: 'Core',
    tailwindKey: 'primary',
  },
  {
    id: 'secondary',
    label: 'Secondary',
    cssVar: '--color-secondary',
    defaultValue: '#1a1f26',
    description: 'Secondary surface color used for sidebars.',
    category: 'Surfaces',
    tailwindKey: 'secondary',
  },
  {
    id: 'accent',
    label: 'Accent',
    cssVar: '--color-accent',
    defaultValue: '#1793d1',
    description: 'Accent color used for links and toggles.',
    category: 'Core',
    tailwindKey: 'accent',
  },
  {
    id: 'muted',
    label: 'Muted Surface',
    cssVar: '--color-muted',
    defaultValue: '#2a2e36',
    description: 'Muted panels, separators and backgrounds.',
    category: 'Surfaces',
    tailwindKey: 'muted',
  },
  {
    id: 'surface',
    label: 'Surface',
    cssVar: '--color-surface',
    defaultValue: '#1a1f26',
    description: 'Base surface color for cards and panels.',
    category: 'Surfaces',
    tailwindKey: 'surface',
  },
  {
    id: 'border',
    label: 'Border',
    cssVar: '--color-border',
    defaultValue: '#2a2e36',
    description: 'Border color for panels and focus outlines.',
    category: 'State',
    tailwindKey: 'border',
  },
  {
    id: 'inverse',
    label: 'Inverse',
    cssVar: '--color-inverse',
    defaultValue: '#000000',
    description: 'Inverse color for text on bright backgrounds.',
    category: 'Core',
    tailwindKey: 'inverse',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    cssVar: '--color-terminal',
    defaultValue: '#00ff00',
    description: 'ANSI green accent used in terminal simulations.',
    category: 'State',
    tailwindKey: 'terminal',
  },
  {
    id: 'focus-ring',
    label: 'Focus Ring',
    cssVar: '--color-focus-ring',
    defaultValue: '#1793d1',
    description: 'Outline color when elements receive focus.',
    category: 'State',
  },
  {
    id: 'selection',
    label: 'Selection',
    cssVar: '--color-selection',
    defaultValue: '#1793d1',
    description: 'Text selection background color.',
    category: 'State',
  },
  {
    id: 'control-accent',
    label: 'Control Accent',
    cssVar: '--color-control-accent',
    defaultValue: '#1793d1',
    description: 'Accent color for toggles and interactive controls.',
    category: 'State',
  },
];
