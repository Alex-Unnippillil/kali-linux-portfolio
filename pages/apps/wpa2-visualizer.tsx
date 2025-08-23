import dynamic from 'next/dynamic';

const WPA2Visualizer = dynamic(() => import('../../apps/wpa2-visualizer'), { ssr: false });

export default WPA2Visualizer;

