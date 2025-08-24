import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface WellKnownResult {
  path: string;
  present: boolean;
  status: number;
  contacts?: string[];
}

const PATHS = [
  'security.txt',
  'mta-sts.txt',
  'change-password',
  'dnt-policy.txt',
  'gpc.json',
];

async function check(domain: string, path: string): Promise<WellKnownResult> {
  const protocol = /^https?:\/\//i.test(domain) ? '' : 'https://';
  const url = `${protocol}${domain}/.well-known/${path}`;
  try {
    const res = await fetch(url);
    const status = res.status;
    const present = status >= 200 && status < 400;
    let contacts: string[] | undefined;
    if (present && path === 'security.txt') {
      const body = await res.text();
      contacts = body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^contact:/i.test(line))
        .map((line) => line.split(':').slice(1).join(':').trim());
    }
    return { path, present, status, contacts };
  } catch (e) {
    return { path, present: false, status: 0 };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const domain = (req.query.domain as string) || req.headers.host;
  if (!domain) {
    return res.status(400).json({ error: 'No domain provided' });
  }
  const results = await Promise.all(PATHS.map((p) => check(domain, p)));
  res.status(200).json({ domain, results });
}

