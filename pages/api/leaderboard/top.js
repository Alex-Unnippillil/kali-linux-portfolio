import { createClient } from '@supabase/supabase-js';
import createErrorResponse from '@/utils/apiErrorResponse';

export default async function handler(
  req,
  res,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json(createErrorResponse('Method not allowed'));
    return;
  }

  const game = typeof req.query.game === 'string' ? req.query.game : '2048';
  const limit = Number(req.query.limit ?? 10);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Leaderboard read disabled: missing Supabase env');
    res.status(503).json(createErrorResponse('Leaderboard unavailable'));
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
    res.status(500).json(createErrorResponse(error.message));
    return;
  }

  res.status(200).json(data ?? []);
}
