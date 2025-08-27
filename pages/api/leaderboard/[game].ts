import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../utils/supabase';

interface RateInfo {
  count: number;
  time: number;
}

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;
const rateLimit = new Map<string, RateInfo>();

function isRateLimited(key: string): boolean {
  const current = Date.now();
  const info = rateLimit.get(key);
  if (!info || current - info.time > RATE_LIMIT_WINDOW) {
    rateLimit.set(key, { count: 1, time: current });
    return false;
  }
  if (info.count >= RATE_LIMIT_MAX) {
    return true;
  }
  info.count += 1;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const { game } = req.query as { game: string };

  if (req.method === 'GET') {
    const [scores, achievements] = await Promise.all([
      supabase
        .from('leaderboard')
        .select('*')
        .eq('game', game)
        .order('score', { ascending: false })
        .limit(10),
      supabase
        .from('achievements')
        .select('*')
        .eq('game', game)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (scores.error || achievements.error) {
      res.status(500).json({ error: scores.error?.message || achievements.error?.message });
      return;
    }
    res.status(200).json({ scores: scores.data, achievements: achievements.data });
    return;
  }

  if (req.method === 'POST') {
    const { player, score, achievement } = req.body as { player: string; score: number; achievement?: string };
    const { error } = await supabase.from('leaderboard').insert({ game, player, score });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (achievement) {
      await supabase.from('achievements').insert({ game, player, achievement });
    }
    res.status(201).json({ success: true });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
