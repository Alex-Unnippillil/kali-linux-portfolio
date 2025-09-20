import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';
import motionPlugin from './eslint-plugin-motion/index.js';

const compat = new FlatCompat();

const config = [
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
    files: ['components/base/**/*.{js,jsx,ts,tsx}', 'components/core/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      motion: motionPlugin,
    },
    rules: {
      'motion/no-raw-motion': 'warn',
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
