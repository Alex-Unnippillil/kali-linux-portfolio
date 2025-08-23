import type { NextApiRequest, NextApiResponse } from 'next';

interface CaaRecord {
  flags: number;
  tag: string;
  value: string;
}

interface CaaResponse {
  ok: boolean;
  records: CaaRecord[];
  issues: string[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CaaResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain } = req.query;
  if (!domain || typeof domain !== 'string' || !/^[A-Za-z0-9.-]+$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain' });
  }

  try {
    const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CAA`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Upstream server error' });
    }
    const data = await response.json();
    const records: CaaRecord[] = (data.Answer || []).map((ans: any) => {
      const match = ans.data.match(/^(\d+)\s+([a-zA-Z0-9]+)\s+"?(.*?)"?$/);
      if (match) {
        return {
          flags: parseInt(match[1], 10),
          tag: match[2].toLowerCase(),
          value: match[3].replace(/^"|"$/g, ''),
        };
      }
      return { flags: 0, tag: '', value: ans.data };
    });

    const issues: string[] = [];
    const issuers = records.filter((r) => r.tag === 'issue').map((r) => r.value);
    const uniqueIssuers = Array.from(new Set(issuers));
    if (uniqueIssuers.length > 1) issues.push('Multiple issuers present');
    if (!records.some((r) => r.tag === 'iodef')) issues.push('Missing iodef record');

    return res.status(200).json({ ok: issues.length === 0, records, issues });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}

