import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const RedirectVisualizer = dynamic(
  () => import('../../apps/redirect-visualizer'),
  { ssr: false }
);

export default function RedirectVisualizerPage() {
  return (
    <UbuntuWindow title="redirect visualizer">
      <RedirectVisualizer />
    </UbuntuWindow>
  );
}
