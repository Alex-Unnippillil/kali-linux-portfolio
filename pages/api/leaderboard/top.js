import { getAnonServerClient } from '../../../lib/service-client';

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

  const supabase = getAnonServerClient();
  if (!supabase) {
    console.warn('Leaderboard read disabled: missing Supabase env');
    res.status(503).json([]);
    return;
  }
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
