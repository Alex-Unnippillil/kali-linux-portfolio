import dynamic from 'next/dynamic';
import Head from 'next/head';

const SqliteViewer = dynamic(
  () => import('../../components/apps/sqlite-viewer'),
  { ssr: false }
);

export default function SqliteViewerPage() {
  return (
    <>
      <Head>
        <title>SQLite Viewer</title>
        <meta
          name="description"
          content="Read-only SQLite database viewer"
        />
      </Head>
      <SqliteViewer />
    </>
  );
}

