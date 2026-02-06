import React from 'react';
import Head from 'next/head';
import { getCspNonce } from '../../utils/csp';

const siteUrl = 'https://unnippillil.com';
const title = "Alex Unnippillil's Portfolio";
const description =
  'Cybersecurity-focused portfolio showcasing simulated Kali Linux tooling, utilities, and retro games.';
const author = 'Alex Unnippillil';
const keywords =
  'Alex Unnippillil, cybersecurity portfolio, Kali Linux portfolio, security tools, Next.js, computer engineering';
const ogImage = `${siteUrl}/images/logos/logo_1200.png`;
const twitterImage = `${siteUrl}/images/logos/logo_1024.png`;
const favicon = '/images/logos/fevicon.svg';
const appleIcon = '/images/logos/logo.png';

export default function Meta() {
  const nonce = getCspNonce();

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta charSet="utf-8" />
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#0f1317" />

      {/* Search Engine */}
      <meta name="image" content={ogImage} />

      {/* Schema.org for Google */}
      <meta itemProp="name" content={title} />
      <meta itemProp="description" content={description} />
      <meta itemProp="image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={twitterImage} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:site_name" content={title} />
      <meta property="og:locale" content="en_CA" />
      <meta property="og:type" content="website" />

      <link rel="canonical" href={siteUrl} />
      <link rel="icon" href={favicon} />
      <link rel="apple-touch-icon" href={appleIcon} />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: author,
            url: siteUrl,
            description,
            image: ogImage,
          }),
        }}
      />
    </Head>
  );
}
