import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const WellKnown = dynamic(() => import('../../apps/well-known'), {
  ssr: false,
});

export default function WellKnownPage() {
  return (
    <UbuntuWindow title="well known">
      <WellKnown />
    </UbuntuWindow>
  );
}
