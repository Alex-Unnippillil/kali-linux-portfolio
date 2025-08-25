import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const HstsPreload = dynamic(() => import('../../apps/hsts-preload'), {
  ssr: false,
});

export default function HstsPreloadPage() {
  return (
    <UbuntuWindow title="hsts preload">
      <HstsPreload />
    </UbuntuWindow>
  );
}
