import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/wireshark');

const Wireshark = dynamic(() => import('../../apps/wireshark'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function WiresharkPage() {
  return <Wireshark />;
}
