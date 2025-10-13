import React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { getCspNonce } from '../../utils/csp';
import { buildOgImageUrl, resolveCanonicalUrl, DEFAULT_SITE_URL } from '../../lib/og';

const DEFAULT_TITLE = "Alex Unnippillil's Portfolio";
const DEFAULT_DESCRIPTION = 'Alex Unnippillil Personal Portfolio Website';
const DEFAULT_KEYWORDS =
  "Alex Unnippillil, Unnippillil's portfolio, linux, kali portfolio, alex unnippillil portfolio, alex computer, alex unnippillil, alex linux, alex unnippillil kali portfolio";
const DEFAULT_OG_LOCALE = 'en-CA';
const DEFAULT_OG_IMAGE = '/images/logos/logo_1200.png';

const resolveOrigin = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }
  return DEFAULT_SITE_URL;
};

const Meta = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '/',
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_OG_IMAGE,
  og = {},
}) => {
  const nonce = getCspNonce();
  const origin = resolveOrigin();
  const canonicalUrl = resolveCanonicalUrl(origin, canonicalPath);

  const ogTitle = og.title ?? title ?? DEFAULT_TITLE;
  const ogDescription = og.description ?? description ?? DEFAULT_DESCRIPTION;
  const ogLocale = (og.locale ?? DEFAULT_OG_LOCALE).replace(/_/g, '-');
  const ogTheme = og.theme === 'light' ? 'light' : 'dark';

  const ogImage = buildOgImageUrl({
    baseUrl: origin,
    title: og.imageTitle ?? ogTitle,
    subtitle: og.subtitle ?? ogDescription,
    locale: ogLocale,
    theme: ogTheme,
    project: og.project,
    badges: og.badges,
    image: og.image ?? image,
  });

  const twitterHandle = og.twitter ?? 'alexunnippillil';
  const twitterCreator = og.twitterCreator ?? 'unnippillil';

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta charSet="utf-8" />
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="author" content="Alex Unnippillil" />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="category" content="16" />
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
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={og.alt ?? `${ogTitle} — ${ogDescription}`} />

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={og.alt ?? `${ogTitle} — ${ogDescription}`} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Alex Unnippillil Personal Portfolio" />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:type" content={og.type ?? 'website'} />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="icon" href="/images/logos/fevicon.svg" />
      <link rel="apple-touch-icon" href="/images/logos/logo.png" />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Alex Unnippillil',
            url: canonicalUrl,
            sameAs: og.sameAs ?? [
              'https://github.com/Alex-Unnippillil',
              'https://www.linkedin.com/in/alex-unnippillil/',
            ],
          }),
        }}
      />
    </Head>
  );
};

Meta.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  canonicalPath: PropTypes.string,
  keywords: PropTypes.string,
  image: PropTypes.string,
  og: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    imageTitle: PropTypes.string,
    subtitle: PropTypes.string,
    locale: PropTypes.string,
    theme: PropTypes.oneOf(['dark', 'light']),
    project: PropTypes.string,
    badges: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    alt: PropTypes.string,
    type: PropTypes.string,
    sameAs: PropTypes.arrayOf(PropTypes.string),
    twitter: PropTypes.string,
    twitterCreator: PropTypes.string,
  }),
};

export default Meta;
