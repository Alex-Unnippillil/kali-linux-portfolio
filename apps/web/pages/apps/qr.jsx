import dynamic from 'next/dynamic';

const QRApp = dynamic(() => import('../../apps/qr'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function QRPage() {
  return <QRApp />;
}

