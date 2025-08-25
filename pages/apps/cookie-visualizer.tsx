import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CookieVisualizer = dynamic(() => import('../../apps/cookie-visualizer'), {
  ssr: false,
});

export default function CookieVisualizerPage() {
  return (
    <UbuntuWindow title="cookie visualizer">
      <CookieVisualizer />
    </UbuntuWindow>
  );
}
