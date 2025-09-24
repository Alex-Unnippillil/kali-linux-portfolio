import type { NextApiRequest, NextApiResponse } from 'next';
import packageJson from '../../package.json';

type HealthResponse = {
  version: string;
  buildTime: string | null;
  node: string;
};

const healthPayload: HealthResponse = {
  version: process.env.npm_package_version ?? packageJson.version,
  buildTime: process.env.BUILD_TIME ?? null,
  node: process.version,
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<HealthResponse>,
) {
  res.status(200).json(healthPayload);
}
