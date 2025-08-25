import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SriAudit = dynamic(() => import('../../apps/sri-audit'), { ssr: false });

export default function SriAuditPage() {
  return (
    <UbuntuWindow title="sri audit">
      <SriAudit />
    </UbuntuWindow>
  );
}
