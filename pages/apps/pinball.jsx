import dynamic from 'next/dynamic';

const Pinball = dynamic(() => import('../../apps/pinball'), {
  ssr: false,
  loading: () => <p role="status">Loading pinball…</p>,
});

export default function PinballPage() {
  return <main style={{ height: '100dvh', minHeight: 360, width: '100%' }}><Pinball /></main>;
}
