import { addScore } from '../../../lib/demo-leaderboard';

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

  addScore({ game, username, score });

  res.status(200).json({ success: true });
}
