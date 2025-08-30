import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import { exampleFlag } from '../../flags';

export const config = { runtime: 'edge' };

export default createFlagsDiscoveryEndpoint(() => getProviderData({ exampleFlag }));
