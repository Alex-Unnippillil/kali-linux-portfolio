import type { NextApiRequest, NextApiResponse } from 'next';

interface CorsResult {
  url: string;
  origin: string | null;
  methods: string[];
  credentials: boolean | null;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { urls } = req.body as { urls?: string[] };
  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: 'Invalid urls' });
  }

  const results: CorsResult[] = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const origin = response.headers.get('access-control-allow-origin');
        const methodsHeader = response.headers.get(
          'access-control-allow-methods'
        );
        const credentialsHeader = response.headers.get(
          'access-control-allow-credentials'
        );
        const methods = methodsHeader
          ? methodsHeader.split(/\s*,\s*/).filter(Boolean)
          : [];
        const credentials =
          credentialsHeader === null
            ? null
            : credentialsHeader.toLowerCase() === 'true';
        return { url, origin, methods, credentials };
      } catch (e) {
        return { url, origin: null, methods: [], credentials: null, error: (e as Error).message };
      }
    })
  );

  const originBreakdown: Record<string, number> = {};
  const methodBreakdown: Record<string, number> = {};
  const credentialsBreakdown = { true: 0, false: 0, null: 0 };

  results.forEach((r) => {
    if (r.origin) originBreakdown[r.origin] = (originBreakdown[r.origin] || 0) + 1;
    r.methods.forEach((m) => {
      methodBreakdown[m] = (methodBreakdown[m] || 0) + 1;
    });
    if (r.credentials === true) credentialsBreakdown.true += 1;
    else if (r.credentials === false) credentialsBreakdown.false += 1;
    else credentialsBreakdown.null += 1;
  });

  return res.status(200).json({
    results,
    breakdown: {
      origins: originBreakdown,
      methods: methodBreakdown,
      credentials: credentialsBreakdown,
    },
  });
}

