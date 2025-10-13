import { baseConfig, compat } from './base.mjs';

const nextConfig = [
  ...baseConfig,
  ...compat.config({
    extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/control-has-associated-label': 'error',
    },
  }),
];

export default nextConfig;
