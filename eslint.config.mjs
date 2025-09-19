import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const config = [
  { ignores: ['components/apps/Chrome/index.tsx'] },
  {
    plugins: {
      'no-top-level-window': noTopLevelWindow,
    },
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'error',
      'no-top-level-window/no-outside-icon-imports': ['error', {
        include: [
          'components/(base|menu|screen|ui|util-components)/',
          'components/ModuleCard',
          'apps/(beef|vscode)/',
        ],
        disallow: [
          { pattern: 'themes/Yaru/window' },
          {
            pattern:
              'themes/Yaru/status/(?:network|audio|battery|decompiler|download|about|chrome_refresh|view-app-grid|education|skills|experience|projects)',
          },
        ],
      }],
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
