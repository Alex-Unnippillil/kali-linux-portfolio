import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchRobots, RobotsData } from '../../lib/robots';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsData | { error: string }>
) {
  const { origin } = req.query;
  if (!origin || typeof origin !== 'string') {
    res.status(400).json({ error: 'Missing origin query parameter' });
    return;
  }

  const data = await fetchRobots(origin);
  res.status(200).json(data);
}
