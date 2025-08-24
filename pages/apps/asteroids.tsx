import dynamic from 'next/dynamic';

const Asteroids = dynamic(() => import('../../apps/asteroids'), { ssr: false });

export default function AsteroidsPage() {
  return <Asteroids />;
}
