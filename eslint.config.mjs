import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

const config = [
  {
    ignores: [
      'components/apps/Chrome/index.tsx',
      'public/apps/**',
      'public/**',
      'apps/**',
      'components/apps/**',
      'chrome-extension/**',
      'components/apps/nonogram.js',
      'games/**',
    ],
  },
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/control-has-associated-label': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  }),
];

export default config;
