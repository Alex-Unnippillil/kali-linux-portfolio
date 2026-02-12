import type { NextApiRequest, NextApiResponse } from 'next';
import createCrashReport from '../../../modules/crash/reporting';
import type { CrashPayload, CrashReport } from '../../../modules/crash/reporting';

interface CrashApiResponse {
  crashId: string;
  summary: string;
  report: CrashReport;
}

interface CrashApiError {
  error: string;
}

const parsePayload = (req: NextApiRequest): CrashPayload => {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as CrashPayload;
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }
  return req.body as CrashPayload;
};

const crashHandler = (req: NextApiRequest, res: NextApiResponse<CrashApiResponse | CrashApiError>) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = parsePayload(req);
    const report = createCrashReport(payload || {});
    res.status(200).json({
      crashId: report.details.crashId,
      summary: report.summary,
      report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process crash report';
    res.status(400).json({ error: message });
  }
};

export default crashHandler;
