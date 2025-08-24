import type { NextApiRequest, NextApiResponse } from 'next';
import { logEvent } from '../../lib/axiom';

interface HeaderReport {
  header: string;
  value: string | null;
  grade: string;
  message: string;
}

interface ApiResponse {
  url: string;
  overallGrade: string;
  results: HeaderReport[];
}

const checks = [
  {
    key: 'content-security-policy',
    name: 'Content-Security-Policy',
    validate: (val: string | null) => !!val,
    remediation: 'Add a strong Content-Security-Policy header to mitigate XSS attacks.',
  },
  {
    key: 'strict-transport-security',
    name: 'Strict-Transport-Security',
    validate: (val: string | null) => !!val && /max-age/i.test(val),
    remediation: 'Serve Strict-Transport-Security with an appropriate max-age to enforce HTTPS.',
  },
  {
    key: 'x-frame-options',
    name: 'X-Frame-Options',
    validate: (val: string | null) => !!val && ['deny', 'sameorigin'].includes(val.toLowerCase()),
    remediation: 'Set X-Frame-Options to SAMEORIGIN or DENY to protect against clickjacking.',
  },
  {
    key: 'x-content-type-options',
    name: 'X-Content-Type-Options',
    validate: (val: string | null) => val?.toLowerCase() === 'nosniff',
    remediation: 'Set X-Content-Type-Options to nosniff to prevent MIME sniffing.',
  },
  {
    key: 'referrer-policy',
    name: 'Referrer-Policy',
    validate: (val: string | null) => !!val,
    remediation: 'Set an explicit Referrer-Policy header to control referrer information.',
  },
];

function gradeFromRatio(ratio: number): string {
  if (ratio === 1) return 'A';
  if (ratio >= 0.8) return 'B';
  if (ratio >= 0.6) return 'C';
  return 'F';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let target = url;
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }

  try {
    const response = await fetch(target, { method: 'GET' });
    const headersObj = Object.fromEntries(response.headers.entries());

    const results: HeaderReport[] = checks.map((check) => {
      const value = headersObj[check.key] ?? null;
      const ok = check.validate(value);
      return {
        header: check.name,
        value,
        grade: ok ? 'A' : 'F',
        message: ok ? 'Present' : check.remediation,
      };
    });

    const score =
      results.filter((r) => r.grade === 'A').length / results.length;
    const overallGrade = gradeFromRatio(score);

    res.status(200).json({ url: target, overallGrade, results });
  } catch (err: unknown) {
    logEvent({
      type: 'api-error',
      path: req.url,
      message: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Failed to fetch url' });
  }
}
