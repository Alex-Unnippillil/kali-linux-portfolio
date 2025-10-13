import dynamic from 'next/dynamic';

const Kismet = dynamic(() => import('../../apps/kismet'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function KismetPage() {
  return <Kismet />;
}
