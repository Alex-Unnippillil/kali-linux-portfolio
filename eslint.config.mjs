import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';
import noDupeAppImports from './eslint-plugin-no-dupe-app-imports/index.js';

const compat = new FlatCompat();

const config = [
  {
    ignores: [
      'components/apps/Chrome/index.tsx',
      'public/**/*',
      'chrome-extension/**/*',
      'src/**/*',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    plugins: {
      'no-top-level-window': noTopLevelWindow,
      'no-dupe-app-imports': noDupeAppImports,
    },
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'error',
      'no-dupe-app-imports/no-dupe-app-imports': 'error',
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
      'jsx-a11y/role-supports-aria-props': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  }),
];

export default config;
