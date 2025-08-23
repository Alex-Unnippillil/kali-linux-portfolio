import dynamic from 'next/dynamic';

const WaybackViewer = dynamic(
  () => import('../../components/apps/wayback-viewer'),
  { ssr: false },
);

export default function WaybackViewerPage() {
  return <WaybackViewer />;
}
