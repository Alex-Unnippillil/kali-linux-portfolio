import { useEffect, useState } from 'react';
import { supabase, subscribeToScores, subscribeToAchievements } from '../utils/supabase';

interface Score {
  id: number;
  player: string;
  score: number;
}

interface Achievement {
  id: number;
  player: string;
  achievement: string;
}

interface LeaderboardProps {
  game: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ game }) => {
  const [scores, setScores] = useState<Score[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/leaderboard/${game}`);
      const data = await res.json();
      setScores(data.scores || []);
      setAchievements(data.achievements || []);
    };
    load();
    const scoreChannel = subscribeToScores(game, (payload) => {
      setScores((prev) => {
        const next = [payload.new, ...prev];
        next.sort((a, b) => b.score - a.score);
        return next.slice(0, 10);
      });
    });
    const achievementChannel = subscribeToAchievements(game, (payload) => {
      setAchievements((prev) => [payload.new, ...prev].slice(0, 10));
    });
    return () => {
      supabase.removeChannel(scoreChannel);
      supabase.removeChannel(achievementChannel);
    };
  }, [game]);

  return (
    <div className="mb-4 p-4 bg-gray-100 rounded">
      <h2 className="text-lg font-bold mb-2">Leaderboard</h2>
      <ul className="mb-4">
        {scores.map((s) => (
          <li key={s.id}>
            {s.player}: {s.score}
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">Recent Achievements</h3>
      <ul>
        {achievements.map((a) => (
          <li key={a.id}>
            {a.player}: {a.achievement}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
