import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const config = [
  { ignores: ['components/apps/Chrome/index.tsx'] },
  {
    plugins: {
      boundaries,
      'no-top-level-window': noTopLevelWindow,
    },
    settings: {
      'boundaries/include': ['components/**/*', 'lib/server/**/*', 'pages/api/**/*'],
      'boundaries/elements': [
        {
          type: 'server',
          pattern: ['lib/server/**', 'pages/api/**'],
          mode: 'full',
        },
        {
          type: 'client',
          pattern: 'components/**',
          mode: 'full',
        },
      ],
    },
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          message: 'Client components must not import server-only modules.',
          rules: [
            {
              from: 'client',
              disallow: ['server'],
            },
          ],
        },
      ],
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          message: 'Node built-ins are restricted to server-only modules.',
          rules: [
            {
              from: 'client',
              disallow: ['node:*', 'fs', 'fs/promises', 'node:fs', 'node:fs/promises'],
            },
          ],
        },
      ],
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
