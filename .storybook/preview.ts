import type { Preview } from '@storybook/react';

import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    layout: 'centered'
  }
};

export default preview;
