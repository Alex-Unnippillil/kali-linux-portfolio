import dynamic from 'next/dynamic';

const Ghidra = dynamic(() => import('../../apps/ghidra'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function GhidraPage() {
  return <Ghidra />;
}
