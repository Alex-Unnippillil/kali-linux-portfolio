import tsParser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import { boundarySettings } from './eslint.config.mjs';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

export default [
  {
    ignores: ['node_modules/**', '.next/**', '.yarn/**', 'out/**', 'public/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      boundaries,
      'no-top-level-window': noTopLevelWindow,
      'react-hooks': reactHooks,
    },
    settings: boundarySettings,
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
];
