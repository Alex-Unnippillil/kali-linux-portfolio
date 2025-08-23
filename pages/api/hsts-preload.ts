import type { NextApiRequest, NextApiResponse } from 'next';

interface HeaderCheck {
  hasHeader: boolean;
  maxAge: boolean;
  includeSubDomains: boolean;
  preload: boolean;
}

interface ApiResponse {
  ok: boolean;
  status: string;
  reasons: string[];
  headerCheck: HeaderCheck;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  const { domain } = req.query;
  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'Missing domain parameter' });
    return;
  }

  try {
    const statusRes = await fetch(
      `https://hstspreload.org/api/v2/status?domain=${encodeURIComponent(domain)}`
    );
    const statusData = await statusRes.json();

    const siteRes = await fetch(`https://${domain}/`, { method: 'GET' });
    const stsHeader = siteRes.headers.get('strict-transport-security');

    const headerCheck: HeaderCheck = {
      hasHeader: !!stsHeader,
      maxAge: false,
      includeSubDomains: false,
      preload: false,
    };
    const reasons: string[] = [];

    if (stsHeader) {
      const lower = stsHeader.toLowerCase();
      const maxAgeMatch = lower.match(/max-age=([0-9]+)/);
      headerCheck.maxAge =
        !!maxAgeMatch && parseInt(maxAgeMatch[1], 10) >= 31536000;
      headerCheck.includeSubDomains = lower.includes('includesubdomains');
      headerCheck.preload = lower.includes('preload');

      if (!headerCheck.maxAge)
        reasons.push('max-age must be at least 31536000');
      if (!headerCheck.includeSubDomains)
        reasons.push('includeSubDomains directive missing');
      if (!headerCheck.preload) reasons.push('preload directive missing');
    } else {
      reasons.push('Missing Strict-Transport-Security header');
    }

    const ok =
      headerCheck.hasHeader &&
      headerCheck.maxAge &&
      headerCheck.includeSubDomains &&
      headerCheck.preload;

    res.status(200).json({
      ok,
      status: statusData.status || 'unknown',
      reasons,
      headerCheck,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
