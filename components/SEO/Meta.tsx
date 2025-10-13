import Head from 'next/head';
import { getCspNonce } from '../../utils/csp';
import {
  PERSON_SCHEMA,
  SITE_METADATA,
  buildPortfolioSchema,
  buildSoftwareApplicationSchema,
} from './schema';

const SCHEMA_PAYLOADS: Record<string, unknown>[] = [
  PERSON_SCHEMA,
  buildPortfolioSchema(),
  buildSoftwareApplicationSchema(),
];

const serializeSchema = (schema: Record<string, unknown>): string =>
  JSON.stringify(schema).replace(/</g, '\\u003C');

const Meta = (): JSX.Element => {
  const nonce = getCspNonce();
  const keywords = SITE_METADATA.keywords.join(', ');

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{SITE_METADATA.title}</title>
      <meta charSet="utf-8" />
      <meta name="title" content={SITE_METADATA.metaTitle} />
      <meta name="description" content={SITE_METADATA.description} />
      <meta name="author" content={SITE_METADATA.author} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content={SITE_METADATA.language} />
      <meta name="category" content={SITE_METADATA.category} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content={SITE_METADATA.themeColor} />

      {/* Search Engine */}
      <meta name="image" content={SITE_METADATA.ogImage} />
      {/* Schema.org for Google */}
      <meta itemProp="name" content={SITE_METADATA.title} />
      <meta itemProp="description" content={SITE_METADATA.description} />
      <meta itemProp="image" content={SITE_METADATA.ogImage} />
      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={SITE_METADATA.metaTitle} />
      <meta name="twitter:description" content={SITE_METADATA.description} />
      <meta name="twitter:site" content="alexunnippillil" />
      <meta name="twitter:creator" content="unnippillil" />
      <meta name="twitter:image:src" content={SITE_METADATA.twitterImage} />
      {/* Open Graph general (Facebook, Pinterest & Google+) */}
      <meta name="og:title" content={SITE_METADATA.metaTitle} />
      <meta name="og:description" content={SITE_METADATA.description} />
      <meta name="og:image" content={SITE_METADATA.ogImage} />
      <meta name="og:url" content={SITE_METADATA.url} />
      <meta name="og:site_name" content={SITE_METADATA.title} />
      <meta name="og:locale" content={SITE_METADATA.locale} />
      <meta name="og:type" content="website" />

      <link rel="canonical" href={SITE_METADATA.canonical} />
      <link rel="icon" href={SITE_METADATA.icon} />
      <link rel="apple-touch-icon" href={SITE_METADATA.appleIcon} />
      {SCHEMA_PAYLOADS.map((schema) => (
        <script
          key={schema['@type'] as string}
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
        />
      ))}
    </Head>
  );
};

export default Meta;

