import Head from 'next/head';
const SITE = 'https://www.unnippillil.com';
export default function Meta({ title = 'Alex Unnippillil | Interactive Engineering Portfolio', description = 'Explore Alex Unnippillil’s software, AI retrieval and security projects, or enter an interactive Linux-style desktop.', path = '/' }) {
  const canonical = `${SITE}${path}`;
  const image = `${SITE}/images/logos/logo_1200.png`;
  return <Head>
    <title>{title}</title><meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} key="description" /><link rel="canonical" href={canonical} key="canonical" />
    <meta property="og:type" content="website" /><meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:url" content={canonical} /><meta property="og:site_name" content="Alex Unnippillil Portfolio" /><meta property="og:image" content={image} />
    <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={title} /><meta name="twitter:description" content={description} /><meta name="twitter:image" content={image} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: 'Alex Unnippillil', url: SITE, sameAs: ['https://github.com/Alex-Unnippillil'] }) }} />
  </Head>;
}
