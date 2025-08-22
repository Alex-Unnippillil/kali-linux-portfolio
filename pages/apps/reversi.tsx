import dynamic from 'next/dynamic';

const Reversi = dynamic(() => import('../../apps/reversi'), { ssr: false });

export default function ReversiPage() {
  return <Reversi />;
}
