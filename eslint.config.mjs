import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  { ignores: ['components/apps/Chrome/index.tsx'] },
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
    },
  }),
];
