import dynamic from 'next/dynamic';
import Head from 'next/head';

const RobotsAuditor = dynamic(() => import('../../components/apps/robots-auditor'), {
  ssr: false,
});

export default function RobotsAuditorPage() {
  const ogImage = '/images/logos/logo_1200.png';
  return (
    <>
      <Head>
        <title>Robots Auditor</title>
        <meta property="og:title" content="Robots Auditor" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <RobotsAuditor />
    </>
  );
}
