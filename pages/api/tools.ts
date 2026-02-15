import type { NextApiRequest, NextApiResponse } from 'next';
import tools from '../../data/kali-tools.json';

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  res.status(200).json(tools);
}
