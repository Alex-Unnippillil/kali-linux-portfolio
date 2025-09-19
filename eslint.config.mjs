import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';
import baselineOverrides from './eslint.overrides.mjs';

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
  {
    files: [
      'app/**/*.{js,jsx,ts,tsx}',
      'components/**/*.{js,jsx,ts,tsx}',
      'hooks/**/*.{js,jsx,ts,tsx}',
      'lib/**/*.{js,jsx,ts,tsx}',
      'modules/**/*.{js,jsx,ts,tsx}',
      'pages/**/*.{js,jsx,ts,tsx}',
      'src/**/*.{js,jsx,ts,tsx}',
      'utils/**/*.{js,ts}',
      'workers/**/*.{js,ts}',
    ],
    rules: {
      complexity: ['error', 20],
      'max-lines-per-function': [
        'error',
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      'max-nested-callbacks': ['error', 4],
    },
  },
  ...baselineOverrides,
];

export default config;
