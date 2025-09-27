import { getDailySeed } from '../../utils/dailySeed';
import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

const Sokoban = createSuspenseAppPage(
  () => import('../../apps/sokoban'),
  {
    appName: 'Sokoban',
  },
);

export default function SokobanPage() {
  return <Sokoban getDailySeed={() => getDailySeed('sokoban')} />;
}
