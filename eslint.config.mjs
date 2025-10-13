import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const jsFilePatterns = ['**/*.{js,cjs,mjs,jsx,ts,tsx}'];

const config = [
  {
    files: jsFilePatterns,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  { ignores: ['components/apps/Chrome/index.tsx'] },
  {
    files: jsFilePatterns,
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
      'jsx-a11y/control-has-associated-label': 'error',
    },
  }),
];

export default config;
