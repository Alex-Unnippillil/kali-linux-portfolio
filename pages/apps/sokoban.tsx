import dynamic from 'next/dynamic';
import Leaderboard from '../../components/Leaderboard';

const Sokoban = dynamic(() => import('../../apps/sokoban'), { ssr: false });

export default function SokobanPage() {
  return (
    <div className="space-y-4">
      <Leaderboard game="sokoban" />
      <Sokoban />
    </div>
  );
}
