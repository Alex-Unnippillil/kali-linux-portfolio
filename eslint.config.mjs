import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const nodeCoreModules = [
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
];

const browserOnlyGlobs = [
  'apps/**/*.{js,jsx,ts,tsx}',
  'calc/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'filters/**/*.{js,jsx,ts,tsx}',
  'games/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'modules/**/*.{js,jsx,ts,tsx}',
  'pages/**/*.{js,jsx,ts,tsx}',
  'player/**/*.{js,jsx,ts,tsx}',
  'src/**/*.{js,jsx,ts,tsx}',
  'styles/**/*.{js,jsx,ts,tsx}',
  'templates/**/*.{js,jsx,ts,tsx}',
  'utils/**/*.{js,jsx,ts,tsx}',
  'workers/**/*.{js,jsx,ts,tsx}',
];

const nodeImportRestriction = [
  'error',
  {
    paths: nodeCoreModules.flatMap((moduleName) => {
      const message =
        'Node.js core modules are not available in browser bundles. Move this logic to a server entry point or replace it with a browser-safe API.';
      const entries = [{ name: moduleName, message }];
      if (!moduleName.startsWith('node:')) {
        entries.push({ name: `node:${moduleName}`, message });
      }
      return entries;
    }),
  },
];

const compat = new FlatCompat();

const config = [
  { ignores: ['components/apps/Chrome/index.tsx'] },
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
  {
    files: browserOnlyGlobs,
    ignores: [
      'pages/api/**',
      'pages/**/api/**',
      'app/api/**',
      'app/**/route.{js,ts}',
      '**/__tests__/**',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': nodeImportRestriction,
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
