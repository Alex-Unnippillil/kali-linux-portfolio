import dynamic from 'next/dynamic';
import Leaderboard from '../../components/Leaderboard';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), { ssr: false });

export default function PasswordGeneratorPage() {
  return (
    <div className="space-y-4">
      <Leaderboard game="password_generator" />
      <PasswordGenerator />
    </div>
  );
}
