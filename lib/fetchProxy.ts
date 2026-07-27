export interface FetchLog {
  id: number;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  requestSize?: number;
  responseSize?: number;
  fromServiceWorkerCache?: boolean;
  error?: unknown;
}

export type FetchEntry = FetchLog;

const active = new Map<number, FetchLog>();
let counter = 0;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function bodySize(body: BodyInit | null | undefined): number | undefined {
  if (body == null) return 0;
  if (typeof body === 'string') return new TextEncoder().encode(body).length;
  if (body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return undefined;
}

export function getActiveFetches(): FetchLog[] {
  return Array.from(active.values());
}

export function onFetchProxy(
  type: 'start' | 'end',
  handler: (e: CustomEvent<FetchLog>) => void,
) {
  const event = `fetchproxy-${type}`;
  if (typeof window !== 'undefined') {
    const listener = (evt: Event) => {
      if (evt instanceof CustomEvent) handler(evt as CustomEvent<FetchLog>);
    };
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  }
  return () => {};
}

function notify(type: 'start' | 'end', record: FetchLog) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`fetchproxy-${type}`, { detail: record }));
  }
}

declare global {
  var __fetchProxyInstalled: boolean | undefined;
}

if (typeof globalThis.fetch === 'function' && !globalThis.__fetchProxyInstalled) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.__fetchProxyInstalled = true;

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const id = ++counter;
    const method =
      init?.method ||
      (typeof Request !== 'undefined' && input instanceof Request && input.method) ||
      'GET';
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    const record: FetchLog = {
      id,
      url,
      method,
      startTime: now(),
      requestSize: init?.body ? bodySize(init.body) : undefined,
    };
    active.set(id, record);
    notify('start', record);

    try {
      const response = await originalFetch(input, init);
      const end = now();
      record.endTime = end;
      record.duration = end - record.startTime;
      record.status = response.status;
      const swHeader =
        response.headers.get('x-sw-cache') ||
        response.headers.get('x-service-worker-cache') ||
        response.headers.get('sw-cache');
      record.fromServiceWorkerCache = !!swHeader && /hit/i.test(swHeader);

      const finalize = (size?: number) => {
        if (typeof size === 'number') record.responseSize = size;
        active.delete(id);
        notify('end', record);
      };

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        finalize(Number(contentLength));
      } else if (typeof response.clone === 'function' && typeof response.arrayBuffer === 'function') {
        try {
          response
            .clone()
            .arrayBuffer()
            .then((buf) => finalize(buf.byteLength))
            .catch(() => finalize());
        } catch {
          finalize();
        }
      } else {
        finalize();
      }

      return response;
    } catch (err) {
      const end = now();
      record.endTime = end;
      record.duration = end - record.startTime;
      record.error = err;
      active.delete(id);
      notify('end', record);
      throw err;
    }
  };
}
