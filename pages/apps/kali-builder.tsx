import dynamic from 'next/dynamic';

const KaliBuilder = dynamic(() => import('../../apps/kali-builder'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function KaliBuilderPage() {
  return <KaliBuilder />;
}
