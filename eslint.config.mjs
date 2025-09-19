import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

export const boundarySettings = {
  'boundaries/elements': [
    { type: 'app', pattern: 'app/**' },
    { type: 'pages', pattern: 'pages/**' },
    { type: 'components', pattern: 'components/**' },
    {
      type: 'apps',
      pattern: [
        'apps/**',
        'calc/**',
        'chrome-extension/**',
        'games/**',
        'player/**',
        'scanner/**',
        'templates/**',
        'john/**',
        'quotes/**',
        'figlet/**',
      ],
    },
    { type: 'hooks', pattern: 'hooks/**' },
    {
      type: 'utils',
      pattern: [
        'utils/**',
        'lib/**',
        'modules/**',
        'data/**',
        'src/**',
        'workers/**',
        'plugins/**',
        'filters/**',
        'scripts/**',
      ],
    },
    { type: 'types', pattern: 'types/**' },
    { type: 'styles', pattern: 'styles/**' },
    {
      type: 'config',
      pattern: [
        'apps.config.js',
        'next.config.js',
        'postcss.config.js',
        'tailwind.config.js',
        'jest.config.js',
        'jest.setup.ts',
        'playwright.config.ts',
        'pa11yci.json',
        'vercel.json',
        'tsconfig*.json',
      ],
    },
  ],
  'boundaries/ignore': [
    '**/*.test.*',
    '**/__tests__/**',
    '**/tests/**',
    '**/*.spec.*',
    '**/*.stories.*',
    '**/*.d.ts',
  ],
};

const compat = new FlatCompat();

const config = [
  { ignores: ['components/apps/Chrome/index.tsx'] },
  {
    plugins: {
      boundaries,
      'no-top-level-window': noTopLevelWindow,
    },
    settings: boundarySettings,
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'error',
    },
  },
  {
    files: ['utils/qrStorage.ts', 'utils/safeStorage.ts', 'utils/sync.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document'],
    },
  },
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/control-has-associated-label': 'error',
    },
  }),
];

export default config;
