import { getServiceClient } from '../../../lib/service-client';

export default async function handler(
  req,
  res,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { game, username, score } = req.body || {};

  if (
    typeof game !== 'string' ||
    typeof username !== 'string' ||
    typeof score !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn('Leaderboard submission disabled: missing Supabase env');
    res.status(503).json({ error: 'Leaderboard unavailable' });
    return;
  }

  const { error } = await supabase
    .from('leaderboard')
    .insert({ game, username: username.slice(0, 50), score });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ success: true });
}
