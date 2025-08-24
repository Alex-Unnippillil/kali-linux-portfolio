import dynamic from 'next/dynamic';

const RedirectVisualizer = dynamic(() => import('../../apps/redirect-visualizer'), {
  ssr: false,
});

export default function RedirectVisualizerPage() {
  return <RedirectVisualizer />;
}

