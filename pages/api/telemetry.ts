import type { NextApiRequest, NextApiResponse } from 'next';

type TelemetryResponse = {
  status: 'ok';
  received: string | null;
  accepted: boolean;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<TelemetryResponse | { status: 'method_not_allowed' }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ status: 'method_not_allowed' });
    return;
  }

  const category = typeof req.body?.category === 'string' ? req.body.category : null;

  res.status(200).json({ status: 'ok', received: category, accepted: true });
}
