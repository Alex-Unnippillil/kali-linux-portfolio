import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const config = [
  { ignores: ['components/apps/Chrome/index.tsx'] },
  {
    plugins: {
      boundaries,
      'no-top-level-window': noTopLevelWindow,
    },
    settings: {
      'boundaries/elements': [
        { type: 'ui', pattern: 'app/**', mode: 'full' },
        { type: 'ui', pattern: 'pages/**', mode: 'full' },
        { type: 'features', pattern: 'components/**', mode: 'full' },
        { type: 'features', pattern: 'apps/**', mode: 'full' },
        { type: 'features', pattern: 'games/**', mode: 'full' },
        { type: 'features', pattern: 'calc/**', mode: 'full' },
        { type: 'features', pattern: 'modules/**', mode: 'full' },
        { type: 'features', pattern: 'hooks/**', mode: 'full' },
        { type: 'features', pattern: 'utils/**', mode: 'full' },
        { type: 'features', pattern: 'workers/**', mode: 'full' },
        { type: 'features', pattern: 'player/**', mode: 'full' },
        { type: 'core', pattern: 'lib/**', mode: 'full' },
        { type: 'core', pattern: 'src/**', mode: 'full' },
        { type: 'core', pattern: 'plugins/**', mode: 'full' },
        { type: 'core', pattern: 'middleware.ts', mode: 'full' },
        { type: 'shared', pattern: 'types/**', mode: 'full' },
        { type: 'shared', pattern: 'data/**', mode: 'full' },
        { type: 'shared', pattern: 'filters/**', mode: 'full' },
        { type: 'shared', pattern: 'templates/**', mode: 'full' },
        { type: 'shared', pattern: 'quotes/**', mode: 'full' },
      ],
    },
    rules: {
      'no-top-level-window/no-top-level-window-or-document': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          message: '${file.type} is not allowed to import ${dependency.type}',
          rules: [
            { from: ['features'], disallow: ['ui'] },
            { from: ['core'], disallow: ['features', 'ui'] },
            { from: ['shared'], disallow: ['core', 'features', 'ui'] },
          ],
        },
      ],
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
