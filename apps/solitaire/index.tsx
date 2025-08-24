import dynamic from 'next/dynamic';

const SolitaireClient = dynamic(() => import('./client'), { ssr: false });

export default function Solitaire() {
  return <SolitaireClient />;
}
