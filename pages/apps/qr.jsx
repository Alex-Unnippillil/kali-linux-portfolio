import dynamic from '@/utils/dynamic';

const QRApp = dynamic(() => import('@/apps/qr'), {
  ssr: false,
});

export default function QRPage() {
  return <QRApp />;
}

