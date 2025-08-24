import type { NextApiRequest, NextApiResponse } from 'next';

// Interface for normalized CSP reports
interface CSPReport {
  'document-uri': string;
  'referrer'?: string;
  'violated-directive'?: string;
  'effective-directive'?: string;
  'original-policy'?: string;
  'disposition'?: string;
  'blocked-uri': string;
  'line-number'?: number;
  'column-number'?: number;
  'source-file'?: string;
  'status-code'?: number;
  [key: string]: any;
}

interface StoredReport {
  ts: number;
  report: CSPReport;
}

const reports: StoredReport[] = [];
const MAX_REPORTS = 500;
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

function normalizeReports(body: any): CSPReport[] {
  const list = Array.isArray(body) ? body : [body];
  return list
    .map((item) => item?.['csp-report'] || item?.body || item)
    .filter(Boolean)
    .map((rep) => ({
      'document-uri': rep['document-uri'] || rep['documentURL'] || rep['url'] || '',
      'referrer': rep['referrer'],
      'violated-directive': rep['violated-directive'] || rep['violatedDirective'],
      'effective-directive': rep['effective-directive'] || rep['effectiveDirective'],
      'original-policy': rep['original-policy'] || rep['originalPolicy'],
      'disposition': rep['disposition'],
      'blocked-uri': rep['blocked-uri'] || rep['blockedURI'] || rep['blocked-url'] || '',
      'line-number': rep['line-number'] || rep['lineNumber'],
      'column-number': rep['column-number'] || rep['columnNumber'],
      'source-file': rep['source-file'] || rep['sourceFile'],
      'status-code': rep['status-code'] || rep['statusCode'],
    }));
}

function validateReport(rep: CSPReport): string[] {
  const errors: string[] = [];
  if (!rep['document-uri']) errors.push('Missing document-uri');
  if (!rep['blocked-uri']) errors.push('Missing blocked-uri');
  if (!rep['violated-directive'] && !rep['effective-directive'])
    errors.push('Missing violated-directive');
  return errors;
}

function prune() {
  const cutoff = Date.now() - MAX_AGE_MS;
  while (reports.length > MAX_REPORTS || (reports[0] && reports[0].ts < cutoff)) {
    reports.shift();
  }
}

function computeTop(list: CSPReport[]): Record<string, { uri: string; count: number }[]> {
  const dirMap: Record<string, Record<string, number>> = {};
  list.forEach((r) => {
    const dir = r['effective-directive'] || r['violated-directive'] || 'unknown';
    const uri = r['blocked-uri'] || 'unknown';
    dirMap[dir] ??= {};
    dirMap[dir][uri] = (dirMap[dir][uri] || 0) + 1;
  });
  return Object.fromEntries(
    Object.entries(dirMap).map(([dir, m]) => [
      dir,
      Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uri, count]) => ({ uri, count })),
    ])
  );
}

export default function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  if (req.method === 'POST') {
    const parsed = normalizeReports(req.body);
    if (parsed.length === 0) {
      res.status(400).json({ error: 'No reports found in request' });
      return;
    }
    const invalid = parsed
      .map((r, i) => ({ i, errors: validateReport(r) }))
      .find((r) => r.errors.length);
    if (invalid) {
      res.status(400).json({ error: 'Invalid CSP report', details: invalid.errors });
      return;
    }
    parsed.forEach((r) => reports.push({ ts: Date.now(), report: r }));
    prune();
    res.status(200).json({ ok: true, count: parsed.length });
    return;
  }

  if (req.method === 'GET') {
    const list = reports.map((r) => r.report);
    res.status(200).json({ reports: list, top: computeTop(list) });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}

export { reports, normalizeReports, validateReport, computeTop };
