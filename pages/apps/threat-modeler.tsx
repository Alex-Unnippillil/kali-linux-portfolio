import dynamic from 'next/dynamic';

const ThreatModeler = dynamic(() => import('../../apps/threat-modeler'), { ssr: false });

export default function ThreatModelerPage() {
  return <ThreatModeler />;
}
