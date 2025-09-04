import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

export default [
  {
    ignores: [
      'components/apps/Chrome/index.tsx',
      'apps/**',
      'components/apps/**',
      'games/**',
      '__tests__/**',
      'tests/**',
      'chrome-extension/**',
      'workers/**',
      'public/**',
      'lib/**',
      'jest.setup.ts',
      'utils/createDynamicApp.js',
      'hooks/useClickOutside.ts'
    ],
  },
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
      'jsx-a11y/control-has-associated-label': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  }),
];
