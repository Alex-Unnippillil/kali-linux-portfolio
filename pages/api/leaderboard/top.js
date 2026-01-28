import { getTopScores } from '../../../lib/demo-leaderboard';

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

  const data = getTopScores({ game, limit });
  res.status(200).json(data);
}
