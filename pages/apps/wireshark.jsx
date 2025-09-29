import dynamic from '@/utils/dynamic';

const Wireshark = dynamic(() => import('../../apps/wireshark'));

export default function WiresharkPage() {
  return <Wireshark />;
}
