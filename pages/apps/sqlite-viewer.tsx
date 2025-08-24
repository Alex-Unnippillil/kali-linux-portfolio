import dynamic from 'next/dynamic';

const SqliteViewer = dynamic(() => import('../../components/apps/sqlite-viewer'), {
  ssr: false,
});

export default function SqliteViewerPage() {
  return <SqliteViewer />;
}

