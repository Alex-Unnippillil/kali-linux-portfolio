import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../components/**/*.mdx',
    '../components/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: path.resolve(__dirname, '../next.config.js')
    }
  },
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag'
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, '..')
    };
    config.cache = {
      type: 'filesystem',
      allowCollectingMemory: true
    };
    config.plugins = config.plugins || [];
    config.plugins.push({
      name: 'storybook-cache-hook-polyfill',
      apply: (compiler: any) => {
        const cache = compiler.cache;
        if (cache && typeof cache === 'object') {
          const hooks = cache.hooks || {};
          if (!hooks.shutdown) {
            hooks.shutdown = { tap: (_name: string, cb: () => void) => cb && cb() };
          }
          cache.hooks = hooks;
        }
      }
    });
    return config;
  }
};

export default config;
