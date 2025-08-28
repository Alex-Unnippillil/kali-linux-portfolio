import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';
import { getDailySeed } from '../../utils/dailySeed';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}
