import dynamic from 'next/dynamic';

const Blackjack = dynamic(() => import('../../components/apps/blackjack'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackPage() {
  return <Blackjack />;
}
