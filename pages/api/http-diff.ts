import type { NextApiRequest, NextApiResponse } from 'next';
import { diffLines } from 'diff';

interface FetchResult {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  redirects: { url: string; status: number }[];
}

const MAX_REDIRECTS = 10;

async function fetchWithRedirects(url: string): Promise<FetchResult> {
  const redirects: { url: string; status: number }[] = [];
  let current = url;
  let response: Response | null = null;

  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    response = await fetch(current, { redirect: 'manual' });
    redirects.push({ url: current, status: response.status });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      const location = response.headers.get('location') as string;
      current = new URL(location, current).toString();
    } else {
      break;
    }
  }

  if (!response) throw new Error('No response');
  const body = await response.text();
  const headers = Object.fromEntries(response.headers.entries());

  return {
    finalUrl: current,
    status: response.status,
    headers,
    body,
    redirects,
  };
}

function headersToString(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { url1, url2 } = req.body as { url1?: string; url2?: string };
  if (!url1 || !url2) {
    res.status(400).json({ error: 'Missing urls' });
    return;
  }

  try {
    const [r1, r2] = await Promise.all([fetchWithRedirects(url1), fetchWithRedirects(url2)]);
    const bodyDiff = diffLines(r1.body, r2.body);
    const headersDiff = diffLines(headersToString(r1.headers), headersToString(r2.headers));
    res.status(200).json({ url1: r1, url2: r2, bodyDiff, headersDiff });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error' });
  }
}

