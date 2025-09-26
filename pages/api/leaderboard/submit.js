import { createClient } from '@supabase/supabase-js';
import createErrorResponse from '@/utils/apiErrorResponse';

export default async function handler(
  req,
  res,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res
      .status(405)
      .json(createErrorResponse('Method not allowed'));
    return;
  }

  const { game, username, score } = req.body || {};

  if (
    typeof game !== 'string' ||
    typeof username !== 'string' ||
    typeof score !== 'number'
  ) {
    res.status(400).json(createErrorResponse('Invalid payload'));
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Leaderboard submission disabled: missing Supabase env');
    res
      .status(503)
      .json(createErrorResponse('Leaderboard unavailable'));
    return;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from('leaderboard')
    .insert({ game, username: username.slice(0, 50), score });

  if (error) {
    res.status(500).json(createErrorResponse(error.message));
    return;
  }

  res.status(200).json({ success: true });
}
