import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccess, version, type ProviderData } from 'flags';
import { getProviderData } from 'flags/next';
import * as appFlags from '../../flags';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const ok = await verifyAccess(req.headers.authorization as string);
  if (!ok) {
    res.status(401).json(null);
    return;
  }

  const data: ProviderData = await getProviderData(appFlags);
  res.setHeader('x-flags-sdk-version', version);
  res.status(200).json(data);
}

