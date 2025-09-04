import { FlatCompat } from '@eslint/eslintrc';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

export default [
  { ignores: ['components/apps/Chrome/index.tsx'] },
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
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
    },
  }),
  {
    files: [
      'components/**/*.{ts,tsx,js,jsx}',
      'games/space-invaders/components/**/*.{ts,tsx,js,jsx}',
    ],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
    },
  },
];
