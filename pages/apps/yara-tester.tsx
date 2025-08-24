import Head from 'next/head';
import dynamic from 'next/dynamic';

const YaraTester = dynamic(() => import('../../apps/yara-tester'), { ssr: false });

export default function YaraTesterPage() {
  return (
    <>
      <Head>
        <title>YARA Tester</title>
        <meta name="description" content="Test YARA rules against sample data" />
      </Head>
      <YaraTester />
    </>
  );
}
