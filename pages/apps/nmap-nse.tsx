import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function NmapNSEPage() {
  return <NmapNSE />;
}
