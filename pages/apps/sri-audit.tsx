import dynamic from 'next/dynamic';

const SriAudit = dynamic(() => import('../../apps/sri-audit'), { ssr: false });

export default function SriAuditPage() {
  return <SriAudit />;
}

