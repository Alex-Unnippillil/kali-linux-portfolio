import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

type CtResult = {
  certId: number;
  sans: string[];
  issuer: string;
  notBefore: string;
  notAfter: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, excludeExpired, unique } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  try {
    const endpoint = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'Upstream rate limit exceeded' });
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Upstream server error' });
    }

    const data = await response.json();
    const results: CtResult[] = [];
    const seen = new Set<string>();
    const now = new Date();

    for (const item of data) {
      const certId = Number(item.id || item.min_cert_id || item.cert_id);
      const sans = String(item.name_value || '').split('\n');
      const notBefore = item.not_before as string;
      const notAfter = item.not_after as string;

      if (excludeExpired === 'true' && new Date(notAfter) < now) {
        continue;
      }

      if (unique === 'true') {
        const unseen = sans.filter((s) => !seen.has(s));
        if (unseen.length === 0) continue;
        unseen.forEach((s) => seen.add(s));
        results.push({ certId, sans: unseen, issuer: item.issuer_name, notBefore, notAfter });
      } else {
        results.push({ certId, sans, issuer: item.issuer_name, notBefore, notAfter });
      }
    }

    return res.status(200).json(results);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}
