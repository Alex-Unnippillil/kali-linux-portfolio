import { FlatCompat } from '@eslint/eslintrc';
import noTopLevelWindow from './eslint-plugin-no-top-level-window/index.js';

const compat = new FlatCompat();

const ICON_BUNDLE_IMPORT_WARNINGS = [
  {
    name: 'lucide-react',
    message: 'Import lucide icons from "lucide-react/icons/<IconName>" to avoid bundling the full library.',
  },
  {
    name: '@heroicons/react/20/solid',
    message: 'Import Heroicons individually, e.g. "@heroicons/react/20/solid/IconName".',
  },
  {
    name: '@heroicons/react/20/outline',
    message: 'Import Heroicons individually, e.g. "@heroicons/react/20/outline/IconName".',
  },
  {
    name: '@heroicons/react/24/solid',
    message: 'Import Heroicons individually, e.g. "@heroicons/react/24/solid/IconName".',
  },
  {
    name: '@heroicons/react/24/outline',
    message: 'Import Heroicons individually, e.g. "@heroicons/react/24/outline/IconName".',
  },
  {
    name: '@radix-ui/react-icons',
    message: 'Import Radix icons from "@radix-ui/react-icons/<IconName>" to keep bundles slim.',
  },
  {
    name: '@tabler/icons-react',
    message: 'Import Tabler icons individually via "@tabler/icons-react/<IconName>".',
  },
  {
    name: '@phosphor-icons/react',
    message: 'Import Phosphor icons via "@phosphor-icons/react/<style>/<IconName>".',
  },
  {
    name: '@phosphor-icons/react/dist/ssr',
    message: 'Import Phosphor icons via "@phosphor-icons/react/<style>/<IconName>".',
  },
  {
    name: 'react-icons',
    message: 'Import icons from specific React Icons sub-packages instead of the root entry.',
  },
];

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
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/control-has-associated-label': 'error',
      'no-restricted-imports': ['error', { paths: ICON_BUNDLE_IMPORT_WARNINGS }],
    },
  }),
];

export default config;
