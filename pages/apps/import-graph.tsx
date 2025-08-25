import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ImportGraph = dynamic(() => import('../../apps/import-graph'), {
  ssr: false,
});

export default function ImportGraphPage() {
  return (
    <UbuntuWindow title="import graph">
      <ImportGraph />
    </UbuntuWindow>
  );
}
