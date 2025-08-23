import dynamic from 'next/dynamic';

const ASNExplorer = dynamic(() => import('../../apps/asn-explorer'), { ssr: false });

export default function ASNExplorerPage() {
  return <ASNExplorer />;
}
