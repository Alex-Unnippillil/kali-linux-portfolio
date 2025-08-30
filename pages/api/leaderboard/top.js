import { createClient } from '@supabase/supabase-js';

/**
 * Retrieve top leaderboard scores.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    res.status(500).json({ error: 'Missing Supabase env' });
    return;
  }

  const game = typeof req.query.game === 'string' ? req.query.game : '2048';
  const limit = Number(req.query.limit ?? 10);

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
