import { HttpRequestPayload, HttpResponsePayload } from '../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockTransport = async (
  request: HttpRequestPayload
): Promise<HttpResponsePayload> => {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  await wait(150);
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const duration = end - start;

  const effectiveUrl = request.url || 'mock://echo';

  const body = {
    ok: true,
    transport: 'mock',
    echo: {
      method: request.method,
      url: effectiveUrl,
      headers: request.headers,
      bodyMode: request.bodyMode,
      bodyText: request.bodyText ?? null,
      formData: request.formData ?? null,
    },
    metrics: {
      latencyMs: Math.round(duration),
      requestedAt: new Date().toISOString(),
    },
    note:
      'This is a demo response. Switch to "Network" transport to send the request with fetch when online.',
  };

  return {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-mock-transport': 'echo',
    },
    body: JSON.stringify(body, null, 2),
    duration,
    transport: 'mock',
  };
};

export default mockTransport;
