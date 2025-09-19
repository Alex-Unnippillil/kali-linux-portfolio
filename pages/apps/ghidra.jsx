import dynamic from 'next/dynamic';

const GhidraApp = dynamic(() => import('../../apps/ghidra'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function GhidraPage() {
  return <GhidraApp />;
}

