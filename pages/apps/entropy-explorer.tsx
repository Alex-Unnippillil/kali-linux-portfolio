import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const EntropyExplorer = dynamic(() => import('../../apps/entropy-explorer'), {
  ssr: false,
});

export default function EntropyExplorerPage() {
  return (
    <UbuntuWindow title="entropy explorer">
      <EntropyExplorer />
    </UbuntuWindow>
  );
}
