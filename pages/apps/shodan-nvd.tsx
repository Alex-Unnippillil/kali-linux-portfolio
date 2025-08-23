import dynamic from 'next/dynamic';

const ShodanNvd = dynamic(() => import('../../apps/shodan-nvd'), { ssr: false });

export default function ShodanNvdPage() {
  return <ShodanNvd />;
}

