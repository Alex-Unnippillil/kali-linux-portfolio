import dynamic from 'next/dynamic';
import Head from 'next/head';

const SpfFlattener = dynamic(() => import('../../apps/spf-flattener'), {
  ssr: false,
});

export default function SpfFlattenerPage() {
  return (
    <>
      <Head>
        <title>SPF Flattener</title>
        <meta
          name="description"
          content="Analyze SPF records, visualize includes, and generate flattened TXT records."
        />
      </Head>
      <SpfFlattener />
    </>
  );
}
