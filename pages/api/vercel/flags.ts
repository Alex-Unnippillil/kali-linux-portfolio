import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccess, version } from 'flags';
import { getProviderData } from 'flags/next';
import * as flagDefs from '../../flags';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const access = await verifyAccess(req.headers.authorization ?? '');
  if (!access) {
    res.status(401).json(null);
    return;
  }

  const { default: _ignored, ...appFlags } = flagDefs;
  const providerData = getProviderData(appFlags);
  res.setHeader('x-flags-sdk-version', version);
  res.status(200).json(providerData);
}
