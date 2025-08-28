import dynamic from 'next/dynamic';

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'), { ssr: false });

export default function NmapNSEPage() {
  return <NmapNSE />;
}
