import { getProviderData } from 'flags/next';
import { NextApiRequest, NextApiResponse } from 'next';
import * as appFlags from '../../flags';

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
  // The verifyAccess helper was removed in newer versions of the flags SDK.
  // For this demo endpoint we simply return the flag provider data.
  const data = await getProviderData(appFlags as any);
  res.status(200).json(data);
};

export default handler;
