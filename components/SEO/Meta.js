import Head from 'next/head';
import { getCspNonce } from '../../utils/csp';

const SITE_NAME = "Alex Unnippillil Portfolio";
const SITE_ORIGIN = 'https://unnippillil.com';
const DEFAULT_META = {
  title: "Alex Unnippillil's Portfolio",
  description: 'Desktop-inspired portfolio showcasing security tool simulations, utilities, and retro games.',
  image: `${SITE_ORIGIN}/images/logos/logo_1200.png`,
  url: SITE_ORIGIN,
  type: 'website',
};
const DEFAULT_KEYWORDS = [
  'Alex Unnippillil',
  "Unnippillil's portfolio",
  'linux desktop portfolio',
  'kali linux portfolio',
  'security tool simulations',
];

const toAbsoluteUrl = (value) => {
  if (!value) return DEFAULT_META.image;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${SITE_ORIGIN}${normalized}`;
};

export default function Meta({
  title,
  description,
  image,
  url,
  type,
  keywords,
  twitterCard = 'summary_large_image',
  twitterSite = 'alexunnippillil',
  twitterCreator = 'unnippillil',
} = {}) {
  const nonce = getCspNonce();
  const metaTitle = title ?? DEFAULT_META.title;
  const metaDescription = description ?? DEFAULT_META.description;
  const metaImage = toAbsoluteUrl(image ?? DEFAULT_META.image);
  const metaUrl = url ? toAbsoluteUrl(url) : DEFAULT_META.url;
  const metaType = type ?? DEFAULT_META.type;
  const metaKeywords = (keywords && keywords.length ? keywords : DEFAULT_KEYWORDS).join(', ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Alex Unnippillil',
    url: SITE_ORIGIN,
    description: metaDescription,
  };

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="author" content="Alex Unnippillil" />
      <meta name="theme-color" content="#0f1317" />

      <meta name="title" content={metaTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="image" content={metaImage} />

      <meta itemProp="name" content={metaTitle} />
      <meta itemProp="description" content={metaDescription} />
      <meta itemProp="image" content={metaImage} />

      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={metaType} />
      <meta property="og:locale" content="en_CA" />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:image" content={metaImage} />

      <link rel="canonical" href={metaUrl} />
      <link rel="icon" href="/images/logos/fevicon.svg" />
      <link rel="apple-touch-icon" href="/images/logos/logo.png" />

      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}
