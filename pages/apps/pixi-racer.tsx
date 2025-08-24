import dynamic from 'next/dynamic';

const PixiRacer = dynamic(() => import('../../apps/pixi-racer'), {
  ssr: false,
});

export default function PixiRacerPage() {
  return <PixiRacer />;
}
