import type { MetadataRoute } from 'next';

type FileHandlerIcon = {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
};

type FileHandler = {
  action: string;
  name: string;
  accept: Record<string, string[]>;
  icons: FileHandlerIcon[];
};

type ExtendedManifest = MetadataRoute.Manifest & {
  offline_page?: string;
  file_handlers?: FileHandler[];
};

const FILE_HANDLER_ACTION = '/apps/files/handle';

const fileHandlers: FileHandler[] = [
  {
    action: FILE_HANDLER_ACTION,
    name: 'Text Document',
    accept: {
      'text/plain': ['.txt'],
    },
    icons: [
      {
        src: '/icons/file-handlers/text-file.svg',
        type: 'image/svg+xml',
        sizes: '96x96',
      },
    ],
  },
  {
    action: FILE_HANDLER_ACTION,
    name: 'Log File',
    accept: {
      'text/plain': ['.log'],
    },
    icons: [
      {
        src: '/icons/file-handlers/log-file.svg',
        type: 'image/svg+xml',
        sizes: '96x96',
      },
    ],
  },
  {
    action: FILE_HANDLER_ACTION,
    name: 'Packet Capture',
    accept: {
      'application/vnd.tcpdump.pcap': ['.pcap'],
    },
    icons: [
      {
        src: '/icons/file-handlers/pcap-file.svg',
        type: 'image/svg+xml',
        sizes: '96x96',
      },
    ],
  },
];

export default function manifest(): MetadataRoute.Manifest {
  const manifestData: ExtendedManifest = {
    name: 'Kali Linux Portfolio',
    short_name: 'KaliPortfolio',
    start_url: '/',
    offline_page: '/offline.html',
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
    share_target: {
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
    },
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
    file_handlers: fileHandlers,
  };

  return manifestData as MetadataRoute.Manifest;
}
