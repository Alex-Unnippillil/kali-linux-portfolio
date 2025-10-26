import dynamic from 'next/dynamic';

const CSRFLabPreview = dynamic(() => import('../../apps/csrf-lab'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CSRFLabPage() {
  return <CSRFLabPreview />;
}
