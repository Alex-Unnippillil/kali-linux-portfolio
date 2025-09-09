import dynamic from 'next/dynamic';

const Ettercap = dynamic(() => import('../../apps/ettercap'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function EttercapPage() {
  return <Ettercap />;
}
