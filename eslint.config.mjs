import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const config = [
  {
    ignores: [
      'components/apps/Chrome/index.tsx',
      'components/apps/nonogram.js',
      'components/apps/reversi.js',
      'chrome-extension/**/*',
      'public/apps/**/*',
    ],
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
    files: ['games/**/*', 'jest.setup.ts'],
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'off',
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
      'jsx-a11y/control-has-associated-label': 'off',
    },
  }),
  {
    files: [
      'components/common/**/*.{js,jsx,ts,tsx}',
      'components/base/**/*.{js,jsx,ts,tsx}',
      'components/screen/**/*.{js,jsx,ts,tsx}',
      'lib/**/*.{js,jsx,ts,tsx}',
      'hooks/**/*.{js,jsx,ts,tsx}',
      'apps.config.js',
      'apps/beef/**/*.{js,jsx,ts,tsx}',
      'apps/dsniff/**/*.{js,jsx,ts,tsx}',
      'apps/ettercap/**/*.{js,jsx,ts,tsx}',
      'apps/hashcat/**/*.{js,jsx,ts,tsx}',
      'apps/hydra/**/*.{js,jsx,ts,tsx}',
      'apps/john/**/*.{js,jsx,ts,tsx}',
      'apps/kismet/**/*.{js,jsx,ts,tsx}',
      'apps/metasploit/**/*.{js,jsx,ts,tsx}',
      'apps/metasploit-post/**/*.{js,jsx,ts,tsx}',
      'apps/mimikatz/**/*.{js,jsx,ts,tsx}',
      'apps/nessus/**/*.{js,jsx,ts,tsx}',
      'apps/openvas/**/*.{js,jsx,ts,tsx}',
      'apps/reaver/**/*.{js,jsx,ts,tsx}',
      'apps/wireshark/**/*.{js,jsx,ts,tsx}',
    ],
    rules: {
      'jsx-a11y/control-has-associated-label': 'error',
    },
  },
];

export default config;
