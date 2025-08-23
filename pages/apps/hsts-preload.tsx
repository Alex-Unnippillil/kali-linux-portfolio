import dynamic from 'next/dynamic';

const HstsPreload = dynamic(() => import('../../components/apps/hsts-preload'), { ssr: false });

export default function HstsPreloadPage() {
  return <HstsPreload />;
}
