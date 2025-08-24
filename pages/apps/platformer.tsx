import dynamic from 'next/dynamic';

const Platformer = dynamic(() => import('../../apps/platformer'), { ssr: false });

export default function PlatformerPage() {
  return <Platformer />;
}
