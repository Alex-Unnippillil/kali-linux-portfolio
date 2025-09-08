import type { Metadata } from 'next';

export const baseMetadata: Metadata = {
  metadataBase: new URL('https://unnippillil.com'),
  title: "Alex Unnippillil's Portfolio",
  description: 'Alex Unnippillil Personal Portfolio Website',
  authors: [{ name: 'Alex Unnippillil' }],
  keywords: [
    'Alex Unnippillil',
    "Unnippillil's portfolio",
    'linux',
    'kali portfolio',
    'alex unnippillil portfolio',
    'alex computer',
    'alex unnippillil',
    'alex linux',
    'alex unnippillil kali portfolio',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Alex Unnippillil Personal Portfolio Website',
    description: 'Alex Unnippillil Personal Portfolio Website.',
    url: 'https://unnippillil.com/',
    siteName: 'Alex Unnippillil Personal Portfolio',
    images: [
      {
        url: '/api/og?title=Alex%20Unnippillil',
        width: 1200,
        height: 630,
        alt: 'Alex Unnippillil logo',
      },
    ],
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Alex Unnippillil Personal Portfolio Website',
    description: 'Alex Unnippillil Personal Portfolio Website',
    site: '@alexunnippillil',
    creator: '@unnippillil',
    images: ['/api/og?title=Alex%20Unnippillil'],
  },
  alternates: {
    canonical: 'https://unnippillil.com/',
    languages: {
      'en-CA': 'https://unnippillil.com/',
    },
  },
};

export default baseMetadata;
