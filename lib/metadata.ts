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
        url: '/images/logos/logo_1200.png',
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
    images: ['/images/logos/logo_1024.png'],
  },
  alternates: {
    canonical: 'https://unnippillil.com/',
    languages: {
      'en-CA': 'https://unnippillil.com/',
    },
  },
};

export function createMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = new URL(path, baseMetadata.metadataBase).toString();
  return {
    ...baseMetadata,
    title,
    description,
    openGraph: {
      ...baseMetadata.openGraph,
      title,
      description,
      url,
    },
    twitter: {
      ...baseMetadata.twitter,
      title,
      description,
    },
    alternates: {
      ...(baseMetadata.alternates || {}),
      canonical: url,
    },
  };
}

export default baseMetadata;
