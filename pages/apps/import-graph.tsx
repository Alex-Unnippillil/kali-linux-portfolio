import dynamic from 'next/dynamic';
import Head from 'next/head';

const ImportGraph = dynamic(() => import('../../apps/import-graph'), { ssr: false });

export default function ImportGraphPage() {
  const ogImage = '/images/logos/logo_1200.png';
  return (
    <>
      <Head>
        <title>Import Graph</title>
        <meta property="og:title" content="Import Graph" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <ImportGraph />
    </>
  );
}
