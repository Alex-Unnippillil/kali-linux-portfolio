import dynamic from '@/utils/dynamic';

const Blackjack = dynamic(() => import('../../apps/blackjack'));

export default function BlackjackPage() {
  return <Blackjack />;
}
