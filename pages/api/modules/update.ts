import type { NextApiRequest, NextApiResponse } from 'next';
import versionData from '../../../data/module-version.json';

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentParam = req.query.version;
  const current = Array.isArray(currentParam)
    ? currentParam[0]
    : currentParam || '0.0.0';
  const latest = versionData.version;
  const needsUpdate = compareSemver(current, latest) < 0;
  res.status(200).json({ current, latest, needsUpdate });
}
