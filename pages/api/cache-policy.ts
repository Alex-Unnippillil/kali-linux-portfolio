import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface PolicyHeaders {
  'cache-control': string | null;
  etag: string | null;
  vary: string | null;
}

interface PolicyResponse {
  ok: boolean;
  headers?: PolicyHeaders;
  grade?: string;
  error?: string;
}

function gradePolicy(headers: PolicyHeaders): string {
  let score = 0;
  const { 'cache-control': cacheControl, etag, vary } = headers;
  if (cacheControl && !/no-store/i.test(cacheControl)) score += 1;
  if (cacheControl && /max-age=\d+/i.test(cacheControl)) score += 1;
  if (etag) score += 1;
  if (vary) score += 1;
  const ratio = score / 4;
  if (ratio === 1) return 'A';
  if (ratio >= 0.75) return 'B';
  if (ratio >= 0.5) return 'C';
  return 'F';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PolicyResponse>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ ok: false, error: 'Missing url parameter' });
    return;
  }

  let target = url;
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }

  try {
    const response = await fetch(target, { method: 'HEAD' });
    const headers: PolicyHeaders = {
      'cache-control': response.headers.get('cache-control'),
      etag: response.headers.get('etag'),
      vary: response.headers.get('vary'),
    };
    const grade = gradePolicy(headers);
    res.status(200).json({ ok: true, headers, grade });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Failed to fetch url' });
  }
}

