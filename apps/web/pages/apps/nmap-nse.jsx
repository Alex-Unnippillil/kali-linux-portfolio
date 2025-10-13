import dynamic from 'next/dynamic';

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function NmapNSEPage() {
  return <NmapNSE />;
}
