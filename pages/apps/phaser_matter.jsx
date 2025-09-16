import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { getAppSkeleton } from '../../components/app-skeletons';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), {
  ssr: false,
  loading: () => getAppSkeleton('phaser_matter', 'Phaser Matter'),
});

export default function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}
