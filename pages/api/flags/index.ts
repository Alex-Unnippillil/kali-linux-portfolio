import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
import * as flags from '../../../app-flags';

// Minimal, typed, and includes access verification internally
export default createFlagsDiscoveryEndpoint(() =>
  getProviderData(flags as Record<string, any>),
);
