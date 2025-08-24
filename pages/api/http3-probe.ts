import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface ProbeResult {
  ok: boolean;
  altSvc: string | null;
  alpnHints: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProbeResult>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ ok: false, altSvc: null, alpnHints: [] });
    return;
  }

  let target: URL;
  try {
    target = new URL(`https://${url}`);
  } catch {
    res.status(400).json({ ok: false, altSvc: null, alpnHints: [] });
    return;
  }

  try {
    const response = await fetch(target.toString(), { method: 'HEAD' });
    const altSvc = response.headers.get('alt-svc');
    const alpnHints = altSvc
      ? altSvc
          .split(',')
          .map((s) => s.trim())
          .filter((s) => /^h3(-\d+)?/.test(s))
          .map((s) => s.split('=')[0])
      : [];
    res.status(200).json({ ok: alpnHints.length > 0, altSvc, alpnHints });
  } catch {
    res.status(500).json({ ok: false, altSvc: null, alpnHints: [] });
  }
}
