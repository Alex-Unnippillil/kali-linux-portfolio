import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';

export const runtime = 'edge';

const handler = createFlagsDiscoveryEndpoint(
  () => getProviderData({}),
  { secret: process.env.FLAGS_SECRET }
);

export { handler as GET };
