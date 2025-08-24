import dynamic from 'next/dynamic';

const IpDnsLeak = dynamic(() => import('../../apps/ip-dns-leak'), {
  ssr: false,
});

export default function IpDnsLeakPage() {
  return <IpDnsLeak />;
}

