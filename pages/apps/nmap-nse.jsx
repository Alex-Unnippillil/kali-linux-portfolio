import dynamic from '@/utils/dynamic';

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'));

export default function NmapNSEPage() {
  return <NmapNSE />;
}
