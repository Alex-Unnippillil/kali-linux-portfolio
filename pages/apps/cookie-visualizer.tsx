import dynamic from 'next/dynamic';

const CookieVisualizer = dynamic(() => import('../../apps/cookie-visualizer'), { ssr: false });

export default function CookieVisualizerPage() {
  return <CookieVisualizer />;
}
