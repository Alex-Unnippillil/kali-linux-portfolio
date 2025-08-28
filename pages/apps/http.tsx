import dynamic from 'next/dynamic';

const HTTPPreview = dynamic(() => import('../../apps/http'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function HTTPPage() {
  return <HTTPPreview />;
}
