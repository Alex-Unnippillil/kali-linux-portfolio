import dynamic from 'next/dynamic';

const DnsToolkit = dynamic(() => import('../../apps/dns-toolkit'), {
  ssr: false,
});

export default function DnsToolkitPage() {
  return <DnsToolkit />;
}

