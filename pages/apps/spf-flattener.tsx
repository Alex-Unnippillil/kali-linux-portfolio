import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SpfFlattener = dynamic(() => import('../../apps/spf-flattener'), {
  ssr: false,
});

export default function SpfFlattenerPage() {
  return (
    <UbuntuWindow title="spf flattener">
      <SpfFlattener />
    </UbuntuWindow>
  );
}
