import dynamic from 'next/dynamic';

const ChessApp = dynamic(() => import('../../apps/chess'), { ssr: false });

export default function ChessPage() {
  return <ChessApp />;
}

