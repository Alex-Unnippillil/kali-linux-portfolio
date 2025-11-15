import dynamic from 'next/dynamic';

const CspBuilderPreview = dynamic(() => import('../../apps/csp-builder'), {
  ssr: false,
  loading: () => <p>Loading CSP builder...</p>,
});

export default function CspBuilderPage() {
  return <CspBuilderPreview />;
}
