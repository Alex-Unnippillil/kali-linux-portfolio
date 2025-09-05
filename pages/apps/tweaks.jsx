import dynamic from 'next/dynamic';

const TweaksApp = dynamic(() => import('../../apps/tweaks'), { ssr: false });

export default function TweaksPage() {
  return <TweaksApp />;
}
