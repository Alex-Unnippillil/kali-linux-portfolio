import dynamic from 'next/dynamic';

const Hydra = dynamic(() => import('../../apps/hydra'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function HydraPage() {
  return <Hydra />;
}

