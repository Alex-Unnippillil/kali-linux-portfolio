import dynamic from 'next/dynamic';

const Pong = dynamic(() => import('../../apps/pong'), { ssr: false });

export default function PongPage() {
  return <Pong />;
}
