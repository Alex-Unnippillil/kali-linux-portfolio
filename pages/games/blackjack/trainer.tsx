import dynamic from 'next/dynamic';

const BlackjackTrainer = dynamic(() => import('../../../games/blackjack/trainer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackTrainerPage() {
  return <BlackjackTrainer />;
}
