import dynamic from 'next/dynamic';

const QrToolApp = dynamic(() => import('../../apps/qr-tool'), { ssr: false });

export default function QrToolPage() {
  return <QrToolApp />;
}
