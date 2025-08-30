import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}
