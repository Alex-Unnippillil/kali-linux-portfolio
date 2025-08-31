import dynamic from '@/utils/dynamic';

const NmapNSE = dynamic(() => import('@/apps/nmap-nse'), {
  ssr: false,
});

export default function NmapNSEPage() {
  return <NmapNSE />;
}
