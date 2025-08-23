import type { NextApiRequest, NextApiResponse } from 'next';

// Interface for CSP reports
interface CSPReport {
  "document-uri": string;
  "referrer"?: string;
  "violated-directive": string;
  "effective-directive"?: string;
  "original-policy"?: string;
  "disposition"?: string;
  "blocked-uri": string;
  "line-number"?: number;
  "column-number"?: number;
  "source-file"?: string;
  "status-code"?: number;
  [key: string]: any; // Allow additional fields if present
}

// In-memory store for CSP reports
const reports: CSPReport[] = [];

// Validate CSP report structure
function isValidCspReport(body: any): boolean {
  if (
    typeof body === 'object' &&
    body !== null &&
    typeof body['csp-report'] === 'object' &&
    body['csp-report'] !== null
  ) {
    // Optionally check for required fields inside csp-report
    const report = body['csp-report'];
    return (
      typeof report['document-uri'] === 'string' &&
      typeof report['violated-directive'] === 'string'
    );
  }
  return false;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method === 'POST') {
    // validate and store incoming report
    if (!isValidCspReport(req.body)) {
      res.status(400).json({ error: 'Invalid CSP report structure' });
      return;
    }
    reports.push(req.body);
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json(reports);
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}

export { reports };
