import dynamic from 'next/dynamic';

const HstsPreload = dynamic(() => import('../../apps/hsts-preload'), { ssr: false });

export default function HstsPreloadPage() {
  return <HstsPreload />;
}
