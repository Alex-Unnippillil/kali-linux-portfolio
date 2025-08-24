import dynamic from 'next/dynamic';
export default dynamic(() => import('./breakout.client'), { ssr: false });
