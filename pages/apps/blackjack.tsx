import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const Blackjack = dynamic(() => import('../../components/apps/blackjack'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function BlackjackPage() {
  return <Blackjack />;
}
