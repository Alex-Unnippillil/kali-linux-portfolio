import globals from 'globals';
import { baseConfig, compat } from './base.mjs';

const reactConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  ...compat.config({
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ],
    settings: {
      react: {
        version: 'detect',
      },
    },
  }),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],
      'react/react-in-jsx-scope': 'off',
    },
  },
];

export default reactConfig;
