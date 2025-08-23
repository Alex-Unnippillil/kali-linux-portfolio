import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for CSP reports
const reports: any[] = [];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method === 'POST') {
    // store incoming report
    reports.push(req.body);
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json(reports);
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}

export { reports };
