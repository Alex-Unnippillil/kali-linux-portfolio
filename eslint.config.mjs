import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const jsFilePatterns = ['**/*.{js,cjs,mjs,jsx,ts,tsx}'];

const config = [
  { ignores: ['components/apps/Chrome/index.tsx', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  {
    files: jsFilePatterns,
    plugins: {
      'no-top-level-window': noTopLevelWindow,
    },
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'error',
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/control-has-associated-label': 'error',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['utils/qrStorage.ts', 'utils/safeStorage.ts', 'utils/sync.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document'],
    },
  },
];

export default config;
