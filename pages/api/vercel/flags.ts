import type { NextApiRequest, NextApiResponse } from 'next';
import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import * as appFlags from '../../../app-flags';

export default createFlagsDiscoveryEndpoint((_req: NextApiRequest, _res: NextApiResponse) => {
  return getProviderData(appFlags);
});
