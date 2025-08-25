import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CspBuilder = dynamic(() => import('../../apps/csp-builder'), {
  ssr: false,
});

export default function CspBuilderPage() {
  return (
    <UbuntuWindow title="csp builder">
      <CspBuilder />
    </UbuntuWindow>
  );
}
