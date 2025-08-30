import type { NextApiRequest, NextApiResponse } from 'next';
import { getProviderData, verifyAccess, version } from 'flags/next';
import * as flags from '../../../app-flags';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const access = await verifyAccess(req.headers.authorization);
  if (!access) {
    res.status(401).json(null);
    return;
  }

  const providerData = getProviderData(flags as Record<string, any>);
  res.setHeader('x-flags-sdk-version', version);
  res.status(200).json(providerData);
}
