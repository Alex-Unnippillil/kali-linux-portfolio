import dynamic from 'next/dynamic';

const PrintersApp = dynamic(() => import('../../apps/printers'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function PrintersPage() {
  return <PrintersApp />;
}
