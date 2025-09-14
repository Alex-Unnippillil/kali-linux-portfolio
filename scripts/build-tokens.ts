import StyleDictionary from 'style-dictionary';
import tokens from '../tokens/index.ts';

const sd = new StyleDictionary({
  tokens,
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'styles/',
      files: [
        {
          destination: 'generated-tokens.css',
          format: 'css/variables',
          options: { selector: ':root' },
        },
        {
          destination: 'generated-tokens-dark.css',
          format: 'css/variables',
          options: { selector: '[data-theme="dark"]' },
        },
      ],
    },
  },
});

sd.buildAllPlatforms();
