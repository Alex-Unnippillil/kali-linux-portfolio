import dynamic from '@/utils/dynamic';

const BlackjackTrainer = dynamic(() => import('../../../games/blackjack/trainer'));

export default function BlackjackTrainerPage() {
  return <BlackjackTrainer />;
}
