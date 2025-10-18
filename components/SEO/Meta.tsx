import { useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCspNonce } from '../../utils/csp';
import {
  buildAlternateLinks,
  buildCanonicalUrl,
  DEFAULT_SEO_LOCALE,
} from '../../lib/seo/config';

export default function Meta(): JSX.Element {
  const nonce = getCspNonce();
  const router = useRouter();
  const asPath = router?.asPath;

  const canonicalUrl = useMemo(() => buildCanonicalUrl(asPath), [asPath]);
  const alternateLinks = useMemo(() => buildAlternateLinks(asPath), [asPath]);

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>Alex Unnippillil&apos;s Portfolio </title>
      <meta charSet="utf-8" />
      <meta name="title" content="Alex Patel Portfolio - Computer Engineering Student" />
      <meta
        name="description"
        content="Alex Unnippillil Personal Portfolio Website"
      />
      <meta name="author" content="Alex Unnippillil" />
      <meta
        name="keywords"
        content="Alex Unnippillil, Unnippillil's portfolio, linux, kali portfolio, alex unnippillil portfolio, alex computer, alex unnippillil, alex linux, alex unnippillil kali portfolio"
      />
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content={DEFAULT_SEO_LOCALE.htmlLang} />
      <meta name="category" content="16" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#0f1317" />

      {/* Search Engine */}
      <meta name="image" content="images/logos/fevicon.png" />
      {/* Schema.org for Google */}
      <meta itemProp="name" content="Alex Unnippillil Portfolio " />
      <meta itemProp="description" content="Alex Unnippillil Personal Portfolio Website" />
      <meta itemProp="image" content="images/logos/fevicon.png" />
      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Alex Unnippillil Personal Portfolio Website" />
      <meta name="twitter:description" content="Alex Unnippillil Personal Portfolio Website" />
      <meta name="twitter:site" content="alexunnippillil" />
      <meta name="twitter:creator" content="unnippillil" />
      <meta name="twitter:image:src" content="images/logos/logo_1024.png" />
      {/* Open Graph general (Facebook, Pinterest & Google+) */}
      <meta name="og:title" content="Alex Unnippillil Personal Portfolio Website " />
      <meta name="og:description" content="Alex Unnippillil Personal Portfolio Website. ." />
      <meta name="og:image" content="https://unnippillil.com/images/logos/logo_1200.png" />
      <meta name="og:url" content={canonicalUrl} />
      <meta name="og:site_name" content="Alex Unnippillil Personal Portfolio" />
      <meta name="og:locale" content={DEFAULT_SEO_LOCALE.ogLocale} />
      <meta name="og:type" content="website" />

      <link rel="canonical" href={canonicalUrl} />
      {alternateLinks.map((link) => (
        <link
          key={`alternate-${link.hrefLang}`}
          rel="alternate"
          hrefLang={link.hrefLang}
          href={link.href}
        />
      ))}
      <link rel="icon" href="images/logos/fevicon.svg" />
      <link rel="apple-touch-icon" href="images/logos/logo.png" />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Alex Unnippillil',
            url: canonicalUrl,
          }),
        }}
      />
    </Head>
  );
}
