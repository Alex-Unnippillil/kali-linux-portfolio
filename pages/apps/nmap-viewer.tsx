import dynamic from 'next/dynamic';
import Head from 'next/head';

const NmapViewerApp = dynamic(() => import('../../components/apps/nmap-viewer'), {
  ssr: false,
});

export default function NmapViewerPage() {
  return (
    <>
      <Head>
        <title>Nmap Viewer</title>
      </Head>
      <NmapViewerApp />
    </>
  );
}
