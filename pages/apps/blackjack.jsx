import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/blackjack');

const Blackjack = dynamic(() => import('../../apps/blackjack'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackPage() {
  return <Blackjack />;
}
