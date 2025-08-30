import { getProviderData } from 'flags/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccess, version, type ProviderData } from 'flags';
import * as appFlags from '../../../app-flags';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProviderData | null>,
): Promise<void> {
  const access = await verifyAccess(req.headers.authorization);
  if (!access) {
    res.status(401).json(null);
    return;
  }

  const data = getProviderData(appFlags as Record<string, unknown>);
  res.setHeader('x-flags-sdk-version', version);
  res.status(200).json(data);
}

