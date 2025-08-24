import dynamic from 'next/dynamic';

const CookieSimulator = dynamic(() => import('../../apps/cookie-simulator'), { ssr: false });

export default function CookieSimulatorPage() {
  return <CookieSimulator />;
}
