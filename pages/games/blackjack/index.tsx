import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/games/blackjack');

const Blackjack = dynamic(() => import('../../../games/blackjack'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackGamePage() {
  return <Blackjack />;
}
