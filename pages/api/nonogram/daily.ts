import type { NextApiRequest, NextApiResponse } from 'next';

const puzzle = {
  id: new Date().toISOString().split('T')[0],
  width: 5,
  height: 5,
  rows: [[1], [3], [5], [3], [1]],
  cols: [[1], [3], [5], [3], [1]],
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json(puzzle);
}
