import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const QRApp = dynamic(() => import('../../apps/qr'), {
  ssr: false,
  loading: () => getAppSkeleton('qr', 'QR Tool'),
});

export default function QRPage() {
  return <QRApp />;
}
