import dynamic from 'next/dynamic';
import Head from 'next/head';

const ShowcaseApp = dynamic(() => import('../components/apps/showcase'), { ssr: false });

export default function ShowcasePage() {
  return (
    <>
      <Head>
        <title>3D/AR Showcase</title>
      </Head>
      <div className="w-screen h-screen">
        <ShowcaseApp />
      </div>
    </>
  );
}
