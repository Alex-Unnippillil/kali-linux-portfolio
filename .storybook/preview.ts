import type { Preview } from '@storybook/react';

import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/print.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    layout: 'centered',
  },
};

export default preview;
