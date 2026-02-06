import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f1317' },
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
  ],
};
