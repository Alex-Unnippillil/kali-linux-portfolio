import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
export const metadata = getPageMetadata('/apps/phaser_matter');

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}
