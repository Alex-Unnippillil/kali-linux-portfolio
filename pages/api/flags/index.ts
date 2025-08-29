import { getProviderData, createFlagsEndpoint } from 'flags/next';
import * as appFlags from '../../flags';

export default createFlagsEndpoint(async (req, res) => {
  res.status(200).json(await getProviderData(appFlags));
});
