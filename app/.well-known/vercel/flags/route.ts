import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
import { type ProviderData } from 'flags';
import * as appFlags from '../../../../app-flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  const providerData: ProviderData = getProviderData(appFlags);
  return providerData;
});
