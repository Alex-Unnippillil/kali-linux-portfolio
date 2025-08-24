import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

type CtSct = {
  timestamp: string;
};

type CtResult = {
  certId: number;
  sans: string[];
  issuer: string;
  notBefore: string;
  notAfter: string;
  scts: CtSct[];
};

type CtResponse = {
  results: CtResult[];
  issuerStats: { issuer: string; count: number }[];
  timeSeries: { date: string; count: number }[];
  suspicious: string[];
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
    const resultsMap = new Map<number, CtResult>();
    const issuerCounts = new Map<string, number>();
    const timeSeries = new Map<string, number>();
    const seen = new Set<string>();
    const now = new Date();
    let wildcardCount = 0;
    let deepWildcard = false;

    for (const item of data) {
      const certId = Number(item.id || item.min_cert_id || item.cert_id);
      const sans = String(item.name_value || '').split('\n');
      const notBefore = item.not_before as string;
      const notAfter = item.not_after as string;
      const issuer = item.issuer_name as string;
      const entryTimestamp = item.entry_timestamp as string;

      if (excludeExpired === 'true' && new Date(notAfter) < now) {
        continue;
      }

      let finalSans = sans;
      if (unique === 'true') {
        finalSans = sans.filter((s) => !seen.has(s));
        if (finalSans.length === 0) continue;
        finalSans.forEach((s) => seen.add(s));
      }

      for (const s of finalSans) {
        if (s.startsWith('*')) wildcardCount++;
        if (s.includes('*.*')) deepWildcard = true;
      }

      if (!resultsMap.has(certId)) {
        resultsMap.set(certId, {
          certId,
          sans: [...finalSans],
          issuer,
          notBefore,
          notAfter,
          scts: [{ timestamp: entryTimestamp }],
        });

        issuerCounts.set(issuer, (issuerCounts.get(issuer) || 0) + 1);
        const dateKey = entryTimestamp?.slice(0, 10);
        if (dateKey) {
          timeSeries.set(dateKey, (timeSeries.get(dateKey) || 0) + 1);
        }
      } else {
        const existing = resultsMap.get(certId)!;
        for (const s of finalSans) {
          if (!existing.sans.includes(s)) existing.sans.push(s);
        }
        if (entryTimestamp && !existing.scts.find((s) => s.timestamp === entryTimestamp)) {
          existing.scts.push({ timestamp: entryTimestamp });
        }
      }
    }

    const results = Array.from(resultsMap.values());
    const issuerStats = Array.from(issuerCounts.entries())
      .map(([issuer, count]) => ({ issuer, count }))
      .sort((a, b) => b.count - a.count);
    const timeSeriesArr = Array.from(timeSeries.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const suspicious: string[] = [];
    if (issuerStats.length > 3) suspicious.push('Multiple issuers detected');
    if (wildcardCount > 5) suspicious.push('High number of wildcard certificates');
    if (deepWildcard) suspicious.push('Multi-level wildcard detected');
    const maxDay = Math.max(0, ...timeSeriesArr.map((t) => t.count));
    if (maxDay > 5) suspicious.push('Spike in certificate issuance');

    const payload: CtResponse = {
      results,
      issuerStats,
      timeSeries: timeSeriesArr,
      suspicious,
    };

    return res.status(200).json(payload);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}
