import { FlatCompat } from '@eslint/eslintrc';
import importPlugin from 'eslint-plugin-import';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const config = [
  { ignores: ['components/apps/Chrome/index.tsx'] },
  {
    plugins: {
      'no-top-level-window': noTopLevelWindow,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.json'],
        },
      },
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
  {
    files: [
      'components/**/*.{js,ts,tsx}',
      'apps/**/*.{js,ts,tsx}',
      'pages/**/*.{js,ts,tsx}',
      'app/**/*.{js,ts,tsx}',
    ],
    ignores: ['pages/api/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@server/*'],
              message: 'Client modules must not import server-only code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['pages/api/**/*.{js,ts,tsx}', 'lib/server/**/*.{js,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@client/*'],
              message: 'Server modules must not import client-only code.',
            },
          ],
        },
      ],
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
