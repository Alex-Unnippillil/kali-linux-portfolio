import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const HashToolkit = dynamic(() => import('../../apps/hash-toolkit'), {
  ssr: false,
});

export default function HashToolkitPage() {
  return (
    <UbuntuWindow title="hash toolkit">
      <HashToolkit />
    </UbuntuWindow>
  );
}
