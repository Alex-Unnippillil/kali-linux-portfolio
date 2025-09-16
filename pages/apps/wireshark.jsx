import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Wireshark = dynamic(() => import('../../apps/wireshark'), {
  ssr: false,
  loading: () => getAppSkeleton('wireshark', 'Wireshark'),
});

export default function WiresharkPage() {
  return <Wireshark />;
}
