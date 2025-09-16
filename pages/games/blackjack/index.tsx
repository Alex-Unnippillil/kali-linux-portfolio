import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Blackjack = dynamic(() => import('../../../games/blackjack'), {
  ssr: false,
  loading: () => getAppSkeleton('blackjack', 'Blackjack'),
});

export default function BlackjackGamePage() {
  return <Blackjack />;
}
