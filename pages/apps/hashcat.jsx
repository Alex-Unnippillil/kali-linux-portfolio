import dynamic from 'next/dynamic';

const Hashcat = dynamic(() => import('../../apps/hashcat'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function HashcatPage() {
  return <Hashcat />;
}

