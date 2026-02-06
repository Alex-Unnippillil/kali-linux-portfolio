import type { MetadataRoute } from 'next';

const icons: NonNullable<MetadataRoute.Manifest['icons']> = [
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
];

const shareTarget: MetadataRoute.Manifest['share_target'] = {
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
};

const shortcuts: NonNullable<MetadataRoute.Manifest['shortcuts']> = [
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
];

const protocolHandlers: NonNullable<MetadataRoute.Manifest['protocol_handlers']> = [
  {
    protocol: 'web+ssh',
    url: '/apps/ssh?target=%s',
  },
  {
    protocol: 'web+term',
    url: '/?open=terminal&command=%s',
  },
];

const manifest = {
  name: 'Kali Linux Portfolio',
  short_name: 'KaliPortfolio',
  start_url: '/',
  display: 'standalone',
  background_color: '#0f1317',
  theme_color: '#0f1317',
  icons,
  share_target: shareTarget,
  shortcuts,
  protocol_handlers: protocolHandlers,
  offline_page: '/offline.html',
} satisfies MetadataRoute.Manifest & { offline_page?: string };

export default function manifestRoute(): MetadataRoute.Manifest {
  return manifest;
}
