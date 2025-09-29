import dynamic from '@/utils/dynamic';

const QRApp = dynamic(() => import('../../apps/qr'));

export default function QRPage() {
  return <QRApp />;
}

