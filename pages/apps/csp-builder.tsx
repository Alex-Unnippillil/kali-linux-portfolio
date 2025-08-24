import dynamic from 'next/dynamic';

const CspBuilder = dynamic(() => import('../../apps/csp-builder'), {
  ssr: false,
});

export default function CspBuilderPage() {
  return <CspBuilder />;
}
