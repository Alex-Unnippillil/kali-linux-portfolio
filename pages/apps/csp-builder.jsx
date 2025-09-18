import dynamic from 'next/dynamic';

const CSPPreview = dynamic(() => import('../../apps/csp-builder'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CSPBuilderPage() {
  return <CSPPreview />;
}
