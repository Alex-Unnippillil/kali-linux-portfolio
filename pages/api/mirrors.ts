import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch('https://mirror-status.kali.org/mirrors.json');
    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch mirrors' });
      return;
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mirrors' });
  }
}
