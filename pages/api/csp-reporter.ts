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

const POLICY_TEMPLATES = [
  { name: 'Basic', policy: "default-src 'self';" },
  {
    name: 'Strict',
    policy:
      "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self';",
  },
];

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

function parsePolicy(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [dir, ...sources] = p.split(/\s+/);
        return [dir, sources];
      })
  );
}

function simulatePolicy(policy: string, list: CSPReport[]) {
  const map = parsePolicy(policy);
  const blocked: { directive: string; uri: string }[] = [];
  list.forEach((r) => {
    const dir = r['effective-directive'] || r['violated-directive'] || '';
    if (!dir) return;
    const sources = map[dir] || map['default-src'] || [];
    const uri = r['blocked-uri'] || '';
    const docOrigin = (() => {
      try {
        return new URL(r['document-uri']).origin;
      } catch {
        return '';
      }
    })();
    const blockedOrigin = (() => {
      try {
        return new URL(uri, r['document-uri']).origin;
      } catch {
        return uri;
      }
    })();
    if (sources.includes("'none'")) {
      blocked.push({ directive: dir, uri });
      return;
    }
    const allowed = sources.some((s) => {
      if (s === '*') return true;
      if (s === "'self'") return blockedOrigin === docOrigin;
      try {
        return blockedOrigin === new URL(s).origin;
      } catch {
        return false;
      }
    });
    if (!allowed) {
      blocked.push({ directive: dir, uri });
    }
  });
  return { blocked };
}

function filterReports(list: CSPReport[], q?: string, directive?: string) {
  return list.filter((r) => {
    const dir = r['effective-directive'] || r['violated-directive'] || '';
    if (directive && !dir.includes(directive)) return false;
    if (q) {
      const hay = `${r['document-uri']} ${r['blocked-uri']} ${r['referrer'] || ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

function sampleReports(list: CSPReport[], rate?: number) {
  if (!rate || rate <= 0 || rate >= 1) return list;
  return list.filter(() => Math.random() < rate);
}

function aggregateReports(list: CSPReport[]) {
  const agg: Record<string, number> = {};
  list.forEach((r) => {
    const dir = r['effective-directive'] || r['violated-directive'] || 'unknown';
    agg[dir] = (agg[dir] || 0) + 1;
  });
  return agg;
}

function buildQuickFixes(top: Record<string, { uri: string; count: number }[]>) {
  const fixes: { directive: string; uri: string; suggestion: string }[] = [];
  Object.entries(top).forEach(([dir, list]) => {
    list.forEach((item) => {
      let origin = item.uri;
      try {
        origin = new URL(item.uri).origin;
      } catch {
        /* ignore */
      }
      fixes.push({
        directive: dir,
        uri: item.uri,
        suggestion: `Consider allowing ${origin} in ${dir} or removing the offending resource`,
      });
    });
  });
  return fixes;
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
    let list = reports.map((r) => r.report);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const dir =
      typeof req.query.directive === 'string' ? req.query.directive : undefined;
    const sampleRate =
      typeof req.query.sample === 'string' ? parseFloat(req.query.sample) : undefined;
    list = filterReports(list, q, dir);
    list = sampleReports(list, sampleRate);
    const top = computeTop(list);
    const summary = aggregateReports(list);
    const fixes = buildQuickFixes(top);
    const policy =
      typeof req.query.policy === 'string' ? req.query.policy : undefined;
    const simulate = policy ? simulatePolicy(policy, list) : undefined;
    if (req.query.download) {
      res.setHeader('Content-Disposition', 'attachment; filename="csp-logs.json"');
    }
    res
      .status(200)
      .json({
        reports: list,
        top,
        summary,
        simulate,
        templates: POLICY_TEMPLATES,
        fixes,
      });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}

export {
  reports,
  normalizeReports,
  validateReport,
  computeTop,
  simulatePolicy,
  filterReports,
  sampleReports,
  aggregateReports,
  POLICY_TEMPLATES,
};
