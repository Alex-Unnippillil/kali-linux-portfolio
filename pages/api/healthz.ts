import type { NextApiRequest, NextApiResponse } from 'next';
import pkg from '../../package.json';
import { execSync } from 'child_process';

function getGitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA)
    return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const data = {
    name: pkg.name,
    version: pkg.version,
    buildTime: new Date().toISOString(),
    gitSha: getGitSha(),
  };
  res.status(200).json(data);
}
