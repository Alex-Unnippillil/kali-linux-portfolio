import { createClient } from '@supabase/supabase-js';
import logger from '../../../utils/logger';

const leaderboardTopLogger = logger.createApiLogger('leaderboard_top');

export default async function handler(
  req,
  res,
) {
  const completeRequest = leaderboardTopLogger.startTimer({ method: req.method });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    completeRequest({ status: 405, code: 'method_not_allowed' });
    return;
  }

  const game = typeof req.query.game === 'string' ? req.query.game : '2048';
  const limit = Number(req.query.limit ?? 10);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    leaderboardTopLogger.warn('Leaderboard read disabled: missing Supabase env');
    res.status(503).json([]);
    completeRequest({ status: 503, code: 'missing_supabase_env' });
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
    leaderboardTopLogger.error('Failed to fetch leaderboard', { error: error.message });
    res.status(500).json({ error: error.message });
    completeRequest({ status: 500, code: 'supabase_error' });
    return;
  }

  res.status(200).json(data ?? []);
  completeRequest({ status: 200, game, limit });
}
