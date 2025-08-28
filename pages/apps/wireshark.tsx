import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const Wireshark = dynamic(() => import('../../apps/wireshark'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function WiresharkPage() {
  return <Wireshark />;
}
