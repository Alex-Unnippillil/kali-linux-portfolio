import dynamic from 'next/dynamic';

const Wireshark = dynamic(() => import('../../apps/wireshark'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function WiresharkPage() {
  return <Wireshark />;
}
