import dynamic from '@/utils/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'));

export default function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}
