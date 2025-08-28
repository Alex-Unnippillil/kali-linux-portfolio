import dynamic from 'next/dynamic';

const Wireshark = dynamic(() => import('../../apps/wireshark'), { ssr: false });

export default function WiresharkPage() {
  return <Wireshark />;
}
