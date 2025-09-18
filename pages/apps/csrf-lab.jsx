import dynamic from 'next/dynamic';

const CSRFLab = dynamic(() => import('../../apps/csrf-lab'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CSRFLabPage() {
  return <CSRFLab />;
}
