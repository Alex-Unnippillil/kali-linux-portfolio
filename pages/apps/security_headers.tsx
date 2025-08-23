import dynamic from 'next/dynamic';

const SecurityHeaders = dynamic(() => import('../../apps/security-headers'), { ssr: false });

export default function SecurityHeadersPage() {
  return <SecurityHeaders />;
}
