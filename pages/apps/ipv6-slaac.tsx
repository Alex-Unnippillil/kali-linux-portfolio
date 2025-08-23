import dynamic from 'next/dynamic';

const Ipv6Slaac = dynamic(() => import('../../apps/ipv6-slaac'), { ssr: false });

export default function Ipv6SlaacPage() {
  return <Ipv6Slaac />;
}

