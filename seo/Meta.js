import Head from 'next/head';
import { useRouter } from 'next/router';
import { baseMetadata } from '@/lib/metadata';

const siteUrl = baseMetadata.metadataBase?.toString().replace(/\/$/, '') || '';

export default function Meta({ title, description, image, canonical, robots = 'index,follow' }) {
  const router = useRouter();
  const pageTitle = title || baseMetadata.title;
  const pageDescription = description || baseMetadata.description;
  const url = (canonical || `${siteUrl}${router.asPath}`).replace(/\/$/, '') || siteUrl;
  const ogImage = image || `/api/og?title=${encodeURIComponent(pageTitle)}`;

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: siteUrl,
    name: baseMetadata.title,
  };

  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: baseMetadata.authors?.[0]?.name || '',
    url: siteUrl,
  };

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: baseMetadata.authors?.[0]?.name || '',
    url: siteUrl,
    logo: `${siteUrl}/images/logos/logo_1200.png`,
  };

  const pathSegments = router.asPath.split('?')[0].split('/').filter(Boolean);
  let breadcrumbLd;
  if (pathSegments.length > 1) {
    const itemListElement = pathSegments.map((segment, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: decodeURIComponent(segment),
      item: `${siteUrl}/${pathSegments.slice(0, index + 1).join('/')}`,
    }));
    breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement,
    };
  }

  const jsonLd = [websiteLd, personLd, organizationLd, breadcrumbLd].filter(Boolean);

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      {baseMetadata.twitter?.card && <meta name="twitter:card" content={baseMetadata.twitter.card} />}
      {baseMetadata.twitter?.site && <meta name="twitter:site" content={baseMetadata.twitter.site} />}
      {baseMetadata.twitter?.creator && <meta name="twitter:creator" content={baseMetadata.twitter.creator} />}
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd.map((data, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </Head>
  );
}
