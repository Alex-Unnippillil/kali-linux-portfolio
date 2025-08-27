import { useCallback, useEffect, useState } from 'react';

export interface ScoreEntry {
  name: string;
  score: number;
  date: number;
}

const prefix = 'leaderboard:';

/**
 * Maintains a simple local leaderboard using localStorage.
 */
export default function useLeaderboard(gameId: string, size = 10) {
  const key = `${prefix}${gameId}`;
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) setScores(JSON.parse(raw));
  }, [key]);

  const addScore = useCallback(
    (name: string, score: number) => {
      const next = [...scores, { name, score, date: Date.now() }]
        .sort((a, b) => b.score - a.score)
        .slice(0, size);
      setScores(next);
      localStorage.setItem(key, JSON.stringify(next));
    },
    [scores, key, size],
  );

  return { scores, addScore };
}
