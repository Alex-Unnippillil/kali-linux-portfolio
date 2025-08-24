import dynamic from 'next/dynamic';

const WellKnown = dynamic(() => import('../../apps/well-known'), {
  ssr: false,
});

export default function WellKnownPage() {
  return <WellKnown />;
}

