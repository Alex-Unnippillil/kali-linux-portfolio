import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CookieSimulator = dynamic(() => import('../../apps/cookie-simulator'), {
  ssr: false,
});

export default function CookieSimulatorPage() {
  return (
    <UbuntuWindow title="cookie simulator">
      <CookieSimulator />
    </UbuntuWindow>
  );
}
