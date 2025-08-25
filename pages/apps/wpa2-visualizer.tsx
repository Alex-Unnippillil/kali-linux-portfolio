import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Wpa2Visualizer = dynamic(() => import('../../apps/wpa2-visualizer'), {
  ssr: false,
});

export default function Wpa2VisualizerPage() {
  return (
    <UbuntuWindow title="wpa2 visualizer">
      <Wpa2Visualizer />
    </UbuntuWindow>
  );
}
