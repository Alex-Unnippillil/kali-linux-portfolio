import { simulateDnsLookup, type DnsLookupRequest } from './dnsUtils';

export type { DnsLookupResponse } from './dnsUtils';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', async (event: MessageEvent<DnsLookupRequest>) => {
  const { id, host } = event.data;

  try {
    const address = await simulateDnsLookup(host);
    ctx.postMessage({ id, type: 'success', host, address });
  } catch (error) {
    ctx.postMessage({
      id,
      type: 'error',
      host,
      error: error instanceof Error ? error.message : 'Unknown error.',
    });
  }
});
