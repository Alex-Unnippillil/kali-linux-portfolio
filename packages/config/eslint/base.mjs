import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import tsParser from '@typescript-eslint/parser';
import noTopLevelWindow from '../../../eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const jsFilePatterns = ['**/*.{js,cjs,mjs,jsx,ts,tsx}'];

export const baseConfig = [
  {
    files: jsFilePatterns,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
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
];

export { compat };
