import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const BlackjackTrainer = dynamic(() => import('../../../games/blackjack/trainer'), {
  ssr: false,
  loading: () => getAppSkeleton('blackjack', 'Blackjack Trainer'),
});

export default function BlackjackTrainerPage() {
  return <BlackjackTrainer />;
}
