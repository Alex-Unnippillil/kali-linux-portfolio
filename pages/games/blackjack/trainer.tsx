import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/games/blackjack/trainer');

const BlackjackTrainer = dynamic(() => import('../../../games/blackjack/trainer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackTrainerPage() {
  return <BlackjackTrainer />;
}
