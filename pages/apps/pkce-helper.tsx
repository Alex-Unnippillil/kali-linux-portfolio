import dynamic from 'next/dynamic';
import Head from 'next/head';

const PkceHelper = dynamic(() => import('../../apps/pkce-helper'), {
  ssr: false,
});

export default function PkceHelperPage() {
  const ogImage = '/images/logos/logo_1200.png';
  return (
    <>
      <Head>
        <title>PKCE Helper</title>
        <meta property="og:title" content="PKCE Helper" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <PkceHelper />
    </>
  );
}

