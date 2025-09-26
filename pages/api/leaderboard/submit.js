import { createClient } from '@supabase/supabase-js';
import logger from '../../../utils/logger';

const leaderboardSubmitLogger = logger.createApiLogger('leaderboard_submit');

export default async function handler(
  req,
  res,
) {
  const completeRequest = leaderboardSubmitLogger.startTimer({ method: req.method });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    completeRequest({ status: 405, code: 'method_not_allowed' });
    return;
  }

  const { game, username, score } = req.body || {};

  if (
    typeof game !== 'string' ||
    typeof username !== 'string' ||
    typeof score !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    completeRequest({ status: 400, code: 'invalid_payload' });
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    leaderboardSubmitLogger.warn('Leaderboard submission disabled: missing Supabase env');
    res.status(503).json({ error: 'Leaderboard unavailable' });
    completeRequest({ status: 503, code: 'missing_supabase_env' });
    return;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from('leaderboard')
    .insert({ game, username: username.slice(0, 50), score });

  if (error) {
    leaderboardSubmitLogger.error('Failed to submit leaderboard score', { error: error.message });
    res.status(500).json({ error: error.message });
    completeRequest({ status: 500, code: 'supabase_error' });
    return;
  }

  res.status(200).json({ success: true });
  completeRequest({ status: 200, game });
}
