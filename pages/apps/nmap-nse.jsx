import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'), {
  ssr: false,
  loading: () => getAppSkeleton('nmap-nse', 'Nmap NSE'),
});

export default function NmapNSEPage() {
  return <NmapNSE />;
}
