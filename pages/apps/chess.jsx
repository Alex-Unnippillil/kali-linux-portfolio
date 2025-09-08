import dynamic from 'next/dynamic';

const ChessApp = dynamic(() => import('../../apps/chess'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ChessPage() {
  return <ChessApp />;
}
