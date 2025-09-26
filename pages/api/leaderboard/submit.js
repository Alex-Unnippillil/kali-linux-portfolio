import { createClient } from '@supabase/supabase-js';
import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../../utils/rateLimiter';

const limiter = createRateLimiter();

export default async function handler(
  req,
  res,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const rate = limiter.check(getRequestIp(req));
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Leaderboard submission disabled: missing Supabase env');
    res.status(503).json({ error: 'Leaderboard unavailable' });
    return;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from('leaderboard')
    .insert({ game, username: username.slice(0, 50), score });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ success: true });
}
