import dynamic from 'next/dynamic';
import Head from 'next/head';

const QRApp = dynamic(() => import('../../apps/qr'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function QRPage() {
  return (
    <>
      <Head>
        <link rel="canonical" href="https://unnippillil.com/qr" />
      </Head>
      <QRApp />
    </>
  );
}

