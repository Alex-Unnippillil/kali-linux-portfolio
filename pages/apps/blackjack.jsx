import dynamic from 'next/dynamic';

const Blackjack = dynamic(() => import('../../apps/blackjack'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackPage() {
  return <Blackjack />;
}
