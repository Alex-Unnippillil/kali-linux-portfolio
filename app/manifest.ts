import type { MetadataRoute } from 'next';

const APP_NAME = 'Kali Linux Portfolio';
const THEME_COLOR = '#0f1317';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'KaliPortfolio',
    description:
      'Kali Linux inspired desktop-style portfolio featuring security tool simulations, utilities, and games.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: '/images/logos/fevicon.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/logos/logo_1024.png',
        sizes: '1024x1023',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Open Terminal',
        short_name: 'Terminal',
        description: 'Launch the terminal simulation instantly.',
        url: '/?open=terminal',
        icons: [
          {
            src: '/themes/Yaru/apps/bash.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      {
        name: 'Browse Files',
        short_name: 'Files',
        description: 'Jump straight to the Files explorer.',
        url: '/?open=files',
        icons: [
          {
            src: '/themes/Yaru/system/folder.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    ],
  };
}
