import dynamic from 'next/dynamic';
import Leaderboard from '../../components/Leaderboard';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), { ssr: false });

export default function PhaserMatterPage() {
  return (
    <div className="space-y-4">
      <Leaderboard game="phaser_matter" />
      <PhaserMatter />
    </div>
  );
}
