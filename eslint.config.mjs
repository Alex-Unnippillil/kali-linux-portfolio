import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const baseConfig = compat.config({
  extends: ['next/core-web-vitals'],
  rules: {
    '@next/next/no-page-custom-font': 'off',
    '@next/next/no-img-element': 'off',
    'jsx-a11y/control-has-associated-label': 'error',
  },
});

const config = [
  { ignores: ['components/apps/Chrome/index.tsx', 'components/apps/**', 'public/apps/**', 'chrome-extension/**'] },
  {
    plugins: {
      'no-top-level-window': noTopLevelWindow,
    },
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
  ...baseConfig,
  {
    files: [
      'apps/*.{js,jsx,ts,tsx}',
      'apps/**/*.{js,jsx,ts,tsx}',
      'games/*.{js,jsx,ts,tsx}',
      'games/**/*.{js,jsx,ts,tsx}',
      'components/apps/*.{js,jsx,ts,tsx}',
      'components/apps/**/*.{js,jsx,ts,tsx}',
    ],
    rules: {
      'jsx-a11y/control-has-associated-label': 'off',
      'no-top-level-window/no-top-level-window-or-document': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
  {
    files: ['jest.setup.ts'],
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'off',
    },
  },
];

export default config;
