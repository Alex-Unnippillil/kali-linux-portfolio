import dynamic from 'next/dynamic';

const Sokoban = dynamic(() => import('../../apps/sokoban'), { ssr: false });

export default function SokobanPage() {
  return <Sokoban />;
}
