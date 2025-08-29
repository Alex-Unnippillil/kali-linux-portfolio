import { useCallback, useEffect, useState } from 'react';
import useOPFS from './useOPFS';

export interface OPFSScoreEntry {
  score: number;
  date: number;
}

export default function useOPFSLeaderboard(gameId: string, limit = 10) {
  const { supported, getDir, readFile, writeFile } = useOPFS();
  const [scores, setScores] = useState<OPFSScoreEntry[]>([]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      const dir = await getDir('leaderboards');
      if (!dir) return;
      const raw = await readFile(`${gameId}.json`, dir);
      if (raw && !cancelled) {
        try {
          setScores(JSON.parse(raw));
        } catch {
          /* ignore parse errors */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, gameId, getDir, readFile]);

  const addScore = useCallback(
    async (score: number) => {
      const next = [...scores, { score, date: Date.now() }]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      setScores(next);
      if (!supported) return;
      const dir = await getDir('leaderboards');
      if (dir) {
        await writeFile(`${gameId}.json`, JSON.stringify(next), dir);
      }
    },
    [scores, limit, supported, gameId, getDir, writeFile],
  );

  return { scores, addScore, supported };
}

