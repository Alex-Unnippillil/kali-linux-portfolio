import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const RobotsAuditor = dynamic(() => import('../../apps/robots-auditor'), {
  ssr: false,
});

export default function RobotsAuditorPage() {
  return (
    <UbuntuWindow title="robots auditor">
      <RobotsAuditor />
    </UbuntuWindow>
  );
}
