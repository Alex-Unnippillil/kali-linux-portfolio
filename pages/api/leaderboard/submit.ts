import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { game, username, score } = req.body as {
    game?: string;
    username?: string;
    score?: number;
  };

  if (
    typeof game !== 'string' ||
    typeof username !== 'string' ||
    typeof score !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid payload' });
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
