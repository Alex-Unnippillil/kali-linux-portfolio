import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ThreatModeler = dynamic(() => import('../../apps/threat-modeler'), {
  ssr: false,
});

export default function ThreatModelerPage() {
  return (
    <UbuntuWindow title="threat modeler">
      <ThreatModeler />
    </UbuntuWindow>
  );
}
