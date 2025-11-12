import dynamic from 'next/dynamic';

const QrToolkit = dynamic(
  () => import(/* webpackPrefetch: true */ '../../components/qr/QrToolkit'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-ub-cool-grey text-white">
        <p className="animate-pulse text-sm tracking-wide">Loading QR toolkit…</p>
      </div>
    ),
  },
);

export default function QRPage() {
  return <QrToolkit />;
}
