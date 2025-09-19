import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '../../../lib/env.server';

export default async function handler(
  req,
  res,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const game = typeof req.query.game === 'string' ? req.query.game : '2048';
  const limit = Number(req.query.limit ?? 10);

  const url = serverEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Leaderboard read disabled: missing Supabase env');
    res.status(503).json([]);
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('leaderboard')
    .select('username, score, game')
    .eq('game', game)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data ?? []);
}
