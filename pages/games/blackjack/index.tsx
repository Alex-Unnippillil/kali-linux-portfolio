import dynamic from '@/utils/dynamic';

const Blackjack = dynamic(() => import('../../../games/blackjack'));

export default function BlackjackGamePage() {
  return <Blackjack />;
}
