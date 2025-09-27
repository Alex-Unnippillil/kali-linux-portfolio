import { getDailySeed } from '../../utils/dailySeed';
import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

const PhaserMatter = createSuspenseAppPage(
  () => import('../../apps/phaser_matter'),
  {
    appName: 'Phaser Matter',
  },
);

export default function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}
