import dynamic from 'next/dynamic';

const LogViewerApp = dynamic(() => import('../../apps/log-viewer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function LogViewerPage() {
  return <LogViewerApp />;
}
