import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import * as appFlags from '@/app-flags';

const { reportValue: _reportValue, ...flags } = appFlags;

export default createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
