import dynamic from 'next/dynamic';
import Head from 'next/head';

const WaybackViewer = dynamic(
  () => import('../../components/apps/wayback-viewer'),
  { ssr: false },
);

export default function WaybackViewerPage() {
  return (
    <>
      <Head>
        <title>Wayback Viewer</title>
        <meta
          name="description"
          content="Browse and diff Internet Archive snapshots"
        />
      </Head>
      <WaybackViewer />
    </>
  );
}
