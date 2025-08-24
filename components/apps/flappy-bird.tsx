import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@apps/flappy-bird'), { ssr: false });

export default function FlappyBird() {
  return <Game />;
}
