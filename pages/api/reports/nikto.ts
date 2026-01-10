import type { NextApiRequest, NextApiResponse } from 'next';
import { performance } from 'perf_hooks';
import { getNiktoReport, getNiktoSeverities } from '../../../lib/reports/nikto';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = performance.now();
  const severity = Array.isArray(req.query.severity)
    ? req.query.severity[0]
    : req.query.severity;
  const path = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;

  const report = getNiktoReport({ severity: severity ?? undefined, pathPrefix: path ?? undefined });
  const duration = performance.now() - start;

  res.status(200).json({
    ...report,
    availableSeverities: ['All', ...getNiktoSeverities()],
    timings: { serverMs: duration },
  });
}
