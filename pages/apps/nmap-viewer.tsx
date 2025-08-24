import dynamic from 'next/dynamic';

const NmapViewerApp = dynamic(() => import('../../components/apps/nmap-viewer'), { ssr: false });

export default function NmapViewerPage() {
  return <NmapViewerApp />;
}
