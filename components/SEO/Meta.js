import React from 'react';
import Head from 'next/head';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  DEFAULT_JSON_LD,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  SOCIAL_TWITTER_HANDLE,
} from '../../lib/seo';
import { getCspNonce } from '../../utils/csp';

const toAbsoluteUrl = (value) => {
  if (!value) {
    return SITE_URL;
  }

  try {
    return new URL(value, SITE_URL).toString();
  } catch (error) {
    console.warn('[Meta] Failed to build absolute URL for', value, error);
    return SITE_URL;
  }
};

const sanitizeKeywords = (keywords) => {
  if (!keywords || keywords.length === 0) {
    return DEFAULT_KEYWORDS.join(', ');
  }

  return keywords.join(', ');
};

export default function Meta({
  title,
  description,
  canonical,
  image,
  type = 'website',
  keywords = DEFAULT_KEYWORDS,
  jsonLd = [],
  noIndex = false,
}) {
  const nonce = getCspNonce();
  const resolvedTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = toAbsoluteUrl(canonical || '/');
  const ogImage = toAbsoluteUrl(image || DEFAULT_IMAGE);
  const mergedJsonLd = [...DEFAULT_JSON_LD, ...jsonLd];

  return (
    <Head>
      <meta charSet="utf-8" />
      <title>{resolvedTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={resolvedDescription} />
      <meta name="keywords" content={sanitizeKeywords(keywords)} />
      <meta name="author" content="Alex Unnippillil" />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <meta name="theme-color" content="#0f1317" />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="icon" href="/images/logos/fevicon.svg" />
      <link rel="apple-touch-icon" href="/images/logos/logo.png" />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_CA" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="Preview of Alex Unnippillil's Kali-inspired portfolio" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={SOCIAL_TWITTER_HANDLE} />
      <meta name="twitter:creator" content={SOCIAL_TWITTER_HANDLE} />

      {mergedJsonLd.map((schema, index) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          key={index}
          nonce={nonce}
          type="application/ld+json"
        />
      ))}
    </Head>
  );
}
