import dynamic from 'next/dynamic';

const CodeViewer = dynamic(() => import('../../apps/code-viewer'), { ssr: false });

export default function CodeViewerPage() {
  return <CodeViewer />;
}
