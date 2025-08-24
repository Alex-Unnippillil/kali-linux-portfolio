import dynamic from 'next/dynamic';
import Head from 'next/head';

const AllApps = dynamic(() => import('../../components/apps/all-apps'), {
  ssr: false,
});

export default function AllAppsPage() {
  const ogImage = '/images/logos/logo_1200.png';
  return (
    <>
      <Head>
        <title>All Apps</title>
        <meta property="og:title" content="All Apps" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <AllApps />
    </>
  );
}
