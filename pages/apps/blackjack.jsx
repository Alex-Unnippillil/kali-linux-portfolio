import dynamic from '@/utils/dynamic';

const Blackjack = dynamic(() => import('@/apps/blackjack'), {
  ssr: false,
});

export default function BlackjackPage() {
  return <Blackjack />;
}
