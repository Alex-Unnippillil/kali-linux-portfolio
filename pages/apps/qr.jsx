import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/qr');

const QRApp = dynamic(() => import('../../apps/qr'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function QRPage() {
  return <QRApp />;
}

