import type { NextApiRequest, NextApiResponse } from 'next';
import { diffLines } from 'diff';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate-server';
import type { ApiResult, DiffPart, FetchMeta, HttpDiffResponse } from '@/types/http-diff';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

const execFileAsync = promisify(execFile);

const MAX_REDIRECTS = 10;

async function fetchWithRedirects(url: string): Promise<FetchMeta> {
  const redirects: { url: string; status: number }[] = [];
  let current = url;
  let response: Response | null = null;
  const start = Date.now();

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
  const h1 = Date.now() - start;
  const altSvc = headers['alt-svc'];
  let http3: FetchMeta['http3'] = { supported: false, h1 };
  if (altSvc && /h3/i.test(altSvc)) {
    try {
      const { stdout } = await execFileAsync('curl', [
        '-s',
        '-o',
        '/dev/null',
        '-w',
        '%{time_total}',
        '--http3',
        url,
      ]);
      const h3 = parseFloat(stdout.trim()) * 1000; // seconds to ms
      http3 = { supported: true, h1, h3, delta: h3 - h1 };
    } catch (e: unknown) {
      http3 = { supported: false, h1, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return {
    finalUrl: current,
    status: response.status,
    headers,
    body,
    redirects,
    altSvc,
    http3,
  };
}

function headersToString(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HttpDiffResponse>,
) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const bodySchema = z.object({ url1: z.string().url(), url2: z.string().url() });
  const parsed = validateRequest(req, res, { bodySchema });
  if (!parsed) return;
  const { url1, url2 } = parsed.body as { url1: string; url2: string };

  try {
    const [r1, r2] = await Promise.all([fetchWithRedirects(url1), fetchWithRedirects(url2)]);
    const bodyDiff = diffLines(r1.body, r2.body) as DiffPart[];
    const headersDiff = diffLines(
      headersToString(r1.headers),
      headersToString(r2.headers),
    ) as DiffPart[];
    const result: ApiResult = { url1: r1, url2: r2, bodyDiff, headersDiff };
    res.status(200).json(result);
  } catch (e: unknown) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'Error' });
  }
}

