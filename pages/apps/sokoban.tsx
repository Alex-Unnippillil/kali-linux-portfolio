import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const Sokoban = dynamic(() => import('../../apps/sokoban'), { ssr: false });

export default function SokobanPage() {
  return <Sokoban getDailySeed={() => getDailySeed('sokoban')} />;
}
