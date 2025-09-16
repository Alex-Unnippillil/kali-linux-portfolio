import type { ReactNode } from 'react';
import { JsonLd } from './ld';

const DEFAULT_SITE_URL = 'https://unnippillil.com';

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
const siteUrl = rawSiteUrl.endsWith('/') ? rawSiteUrl.slice(0, -1) : rawSiteUrl;

const personStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${siteUrl}#person`,
  name: 'Alex Unnippillil',
  jobTitle: 'Cybersecurity Specialist',
  url: siteUrl,
  image: `${siteUrl}/images/logos/logo_1200.png`,
  email: 'mailto:alex.unnippillil@hotmail.com',
  sameAs: [
    'https://github.com/Alex-Unnippillil',
    'https://www.linkedin.com/in/alex-unnippillil',
  ],
};

const breadcrumbSchemas = [
  {
    scriptId: 'jsonld-breadcrumb-profile',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}/profile#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Profile',
          item: `${siteUrl}/profile`,
        },
      ],
    },
  },
  {
    scriptId: 'jsonld-breadcrumb-apps',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}/apps#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Apps',
          item: `${siteUrl}/apps`,
        },
      ],
    },
  },
  {
    scriptId: 'jsonld-breadcrumb-project-gallery',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}/apps/project-gallery#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Apps',
          item: `${siteUrl}/apps`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Project Gallery',
          item: `${siteUrl}/apps/project-gallery`,
        },
      ],
    },
  },
  {
    scriptId: 'jsonld-breadcrumb-contact',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}/apps/contact#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Apps',
          item: `${siteUrl}/apps`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Contact',
          item: `${siteUrl}/apps/contact`,
        },
      ],
    },
  },
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <JsonLd id="jsonld-person" data={personStructuredData} />
        {breadcrumbSchemas.map(({ scriptId, data }) => (
          <JsonLd key={scriptId} id={scriptId} data={data} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
