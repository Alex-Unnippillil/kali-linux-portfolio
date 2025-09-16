import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/nmap-nse');

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function NmapNSEPage() {
  return <NmapNSE />;
}
