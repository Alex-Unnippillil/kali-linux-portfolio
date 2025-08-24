import dynamic from 'next/dynamic';

const TLSViewer = dynamic(() => import('../../apps/tls-viewer'), {
  ssr: false,
});

export default function TLSViewerPage() {
  return <TLSViewer />;
}

