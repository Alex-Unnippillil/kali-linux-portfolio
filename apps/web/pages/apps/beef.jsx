import dynamic from 'next/dynamic';

const Beef = dynamic(() => import('../../apps/beef'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BeefPage() {
  return <Beef />;
}
