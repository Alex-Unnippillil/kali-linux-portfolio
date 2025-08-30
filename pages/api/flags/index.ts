import { getProviderData } from 'flags/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccess, version, ProviderData } from 'flags';
import * as appFlags from '@/appFlags';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const authorized = await verifyAccess(req.headers.authorization);
  if (!authorized) {
    res.status(401).json(null);
    return;
  }

  const data = (await getProviderData(appFlags as any)) as ProviderData;
  res.setHeader('x-flags-sdk-version', version);
  res.status(200).json(data);
};

export default handler;
