import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const typescriptFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const typescriptConfigs = tseslint.configs['flat/recommended'].map((configEntry) =>
  configEntry.files ? configEntry : { ...configEntry, files: typescriptFiles },
);

const importTypescriptSettings = importPlugin.configs.typescript?.settings ?? {};
const importCoreModules = importTypescriptSettings['import/core-modules'] ?? [];
const importRules = {
  ...importPlugin.configs.recommended.rules,
  ...importPlugin.configs.typescript.rules,
  'import/no-named-as-default': 'off',
};
const importSettings = {
  ...importTypescriptSettings,
  'import/core-modules': [...importCoreModules, '/vendor/gamepad.js'],
  'import/resolver': {
    ...(importTypescriptSettings['import/resolver'] ?? {}),
    typescript: {
      project: ['./tsconfig.json', './tsconfig.gamepad.json'],
    },
    node: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'],
    },
  },
};

const config = [
  { linterOptions: { reportUnusedDisableDirectives: true } },
  { ignores: ['**/node_modules/**', 'components/apps/Chrome/index.tsx'] },
  ...typescriptConfigs,
  {
    files: typescriptFiles,
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: importSettings,
    rules: importRules,
  },
  {
    files: ['public/**/*.{js,jsx}', 'chrome-extension/**/*.{js,jsx}'],
    rules: {
      'import/no-unresolved': 'off',
    },
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
      'jsx-a11y/control-has-associated-label': 'error',
    },
  }),
];

export default config;
