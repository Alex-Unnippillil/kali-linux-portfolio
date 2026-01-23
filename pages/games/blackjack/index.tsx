import dynamic from 'next/dynamic';

const Blackjack = dynamic(() => import('../../../games/blackjack/index'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackGamePage() {
  return <Blackjack />;
}
