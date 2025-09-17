import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';

interface StoredReport {
  id: string;
  receivedAt: string;
  source: 'report-to' | 'report-uri' | 'unknown';
  type: string | null;
  url: string | null;
  violatedDirective: string | null;
  blockedURL: string | null;
  originalPolicy: string | null;
  disposition: string | null;
  referrer: string | null;
  userAgent: string | null;
  body: unknown;
}

const MAX_REPORTS = 200;
const reports: StoredReport[] = [];

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function storeReports(entries: StoredReport[]) {
  if (!entries.length) {
    return;
  }
  reports.unshift(...entries);
  if (reports.length > MAX_REPORTS) {
    reports.length = MAX_REPORTS;
  }
}

async function readRequestBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }
  if (chunks.length === 0) {
    return '';
  }
  return Buffer.concat(chunks).toString('utf8');
}

function fromReportToPayload(payload: unknown, fallbackUA: string | null): StoredReport[] {
  const now = new Date().toISOString();
  const items = Array.isArray(payload) ? payload : [payload];
  return items
    .map((entry) => (typeof entry === 'object' && entry !== null ? entry : null))
    .filter((entry): entry is Record<string, any> => entry !== null)
    .map((entry) => {
      const body = typeof entry.body === 'object' && entry.body !== null ? entry.body : {};
      return {
        id: randomUUID(),
        receivedAt: now,
        source: 'report-to',
        type: typeof entry.type === 'string' ? entry.type : 'csp-violation',
        url: pickString(entry.url, body?.documentURL, body?.documentUri),
        violatedDirective: pickString(
          body?.effectiveDirective,
          body?.violatedDirective,
          body?.['effective-directive'],
          body?.['violated-directive']
        ),
        blockedURL: pickString(
          body?.blockedURL,
          body?.blockedUri,
          body?.blockedURI,
          body?.['blocked-uri'],
          body?.['blocked-url']
        ),
        originalPolicy: pickString(body?.originalPolicy, body?.['original-policy']),
        disposition: pickString(body?.disposition),
        referrer: pickString(body?.referrer, body?.['referrer']),
        userAgent: pickString(entry.user_agent, fallbackUA ?? undefined) ?? null,
        body,
      };
    });
}

function fromLegacyPayload(payload: unknown, fallbackUA: string | null): StoredReport[] {
  const now = new Date().toISOString();
  const base =
    payload && typeof payload === 'object' && 'csp-report' in (payload as Record<string, any>)
      ? (payload as Record<string, any>)['csp-report']
      : payload;
  if (!base || typeof base !== 'object') {
    return [];
  }
  const body = base as Record<string, any>;
  return [
    {
      id: randomUUID(),
      receivedAt: now,
      source: 'report-uri',
      type: 'csp-report',
      url: pickString(body['document-uri'], body['document-url'], body['url']),
      violatedDirective: pickString(body['effective-directive'], body['violated-directive']),
      blockedURL: pickString(body['blocked-url'], body['blocked-uri'], body['blockedURL']),
      originalPolicy: pickString(body['original-policy'], body['policy']),
      disposition: pickString(body['disposition'], body['status']),
      referrer: pickString(body['referrer'], body['referrer-uri']),
      userAgent: fallbackUA,
      body,
    },
  ];
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method?.toUpperCase();
  if (method === 'GET') {
    res.status(200).json({ reports, max: MAX_REPORTS });
    return;
  }

  if (method === 'DELETE') {
    reports.length = 0;
    res.status(204).end();
    return;
  }

  if (method !== 'POST') {
    res.setHeader('Allow', 'GET,POST,DELETE');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody = await readRequestBody(req);
    if (!rawBody) {
      res.status(204).end();
      return;
    }

    const contentTypeHeader = Array.isArray(req.headers['content-type'])
      ? req.headers['content-type'][0]
      : req.headers['content-type'] || '';
    const normalizedType = contentTypeHeader.toLowerCase();
    const fallbackUA = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'] || null;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = null;
    }

    let stored: StoredReport[] = [];
    if (normalizedType.includes('application/reports+json')) {
      stored = fromReportToPayload(parsed ?? rawBody, fallbackUA);
    } else if (normalizedType.includes('application/csp-report')) {
      stored = fromLegacyPayload(parsed ?? rawBody, fallbackUA);
    } else if (parsed) {
      stored = fromReportToPayload(parsed, fallbackUA);
    }

    if (stored.length === 0) {
      stored = [
        {
          id: randomUUID(),
          receivedAt: new Date().toISOString(),
          source: 'unknown',
          type: null,
          url: null,
          violatedDirective: null,
          blockedURL: null,
          originalPolicy: null,
          disposition: null,
          referrer: null,
          userAgent: fallbackUA,
          body: parsed ?? rawBody,
        },
      ];
    }

    storeReports(stored);
  } catch (error) {
    console.error('Failed to record security report', error);
  }

  res.status(204).end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
