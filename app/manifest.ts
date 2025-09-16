import type { MetadataRoute } from 'next';

const shareTarget = {
  action: '/share-target',
  method: 'POST',
  enctype: 'multipart/form-data',
  params: {
    title: 'title',
    text: 'text',
    url: 'url',
    files: [
      {
        name: 'files',
        accept: ['*/*'],
      },
    ],
  },
} as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kali Linux Portfolio',
    short_name: 'KaliPortfolio',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1317',
    theme_color: '#0f1317',
    icons: [
      {
        src: '/images/logos/fevicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/logos/logo_1024.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Open Terminal',
        short_name: 'Terminal',
        url: '/?open=terminal',
      },
      {
        name: 'New Note',
        short_name: 'Note',
        url: '/apps/sticky_notes/',
      },
      {
        name: 'Open 2048 Daily',
        short_name: '2048',
        url: '/?open=2048&daily=true',
      },
    ],
    offline_page: '/offline.html',
    share_target: shareTarget,
  } as MetadataRoute.Manifest;
}
