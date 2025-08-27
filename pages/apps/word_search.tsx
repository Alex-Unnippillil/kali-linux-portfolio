import dynamic from 'next/dynamic';
import Leaderboard from '../../components/Leaderboard';

const WordSearch = dynamic(() => import('../../apps/word_search'), { ssr: false });

export default function WordSearchPage() {
  return (
    <div className="space-y-4">
      <Leaderboard game="word_search" />
      <WordSearch />
    </div>
  );
}
