import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag',
  },
  babel: async (config) => ({
    ...config,
    presets: [
      ...(config.presets || []),
      [require.resolve('@babel/preset-typescript'), { isTSX: true, allExtensions: true }],
    ],
  }),
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, '..'),
    };
    config.resolve.extensions = Array.from(
      new Set([...(config.resolve.extensions || []), '.ts', '.tsx']),
    );

    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.[jt]sx?$/,
      exclude: /node_modules/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            require.resolve('@babel/preset-env'),
            [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
            [
              require.resolve('@babel/preset-typescript'),
              { isTSX: true, allExtensions: true },
            ],
          ],
        },
      },
    });
    return config;
  },
};

export default config;
