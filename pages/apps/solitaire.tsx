import dynamic from 'next/dynamic';

const Solitaire = dynamic(() => import('../../apps/solitaire'), { ssr: false });

export default function SolitairePage() {
  return <Solitaire />;
}
