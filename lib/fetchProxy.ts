import { performanceBudgetManager } from '../utils/performanceBudgetManager';

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
  appId?: string;
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
    window.addEventListener(event, handler as EventListener);
    return () => window.removeEventListener(event, handler as EventListener);
  }
  return () => {};
}

function notify(type: 'start' | 'end', record: FetchLog) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`fetchproxy-${type}`, { detail: record }));
  }
}

if (typeof globalThis.fetch === 'function' && !(globalThis as any).__fetchProxyInstalled) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  (globalThis as any).__fetchProxyInstalled = true;

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
    const requestSize = init?.body ? bodySize(init.body) : undefined;
    const appId = performanceBudgetManager.getActiveApp();
    const record: FetchLog = {
      id,
      url,
      method,
      startTime: now(),
      requestSize,
      appId,
    };

    if (requestSize && requestSize > 0) {
      const allowUpload = performanceBudgetManager.shouldAllow(
        appId,
        { mb: requestSize / (1024 * 1024) },
        { type: 'network upload', description: `${method} ${url}` },
      );
      if (!allowUpload) {
        record.error = new Error('Network upload blocked by performance budget');
        record.endTime = now();
        record.duration = record.endTime - record.startTime;
        throw record.error;
      }
    }

    active.set(id, record);
    notify('start', record);

    try {
      const response = await originalFetch(input as any, init);
      const end = now();
      record.endTime = end;
      record.duration = end - record.startTime;
      record.status = response.status;
      const swHeader =
        response.headers.get('x-sw-cache') ||
        response.headers.get('x-service-worker-cache') ||
        response.headers.get('sw-cache');
      record.fromServiceWorkerCache = !!swHeader && /hit/i.test(swHeader);

      let responseSize: number | undefined;
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const parsed = Number(contentLength);
        if (!Number.isNaN(parsed)) {
          responseSize = parsed;
        }
      } else if (
        typeof (response as any).clone === 'function' &&
        typeof (response as any).arrayBuffer === 'function'
      ) {
        try {
          const clone = response.clone();
          const buf = await clone.arrayBuffer();
          responseSize = buf.byteLength;
        } catch {
          responseSize = undefined;
        }
      }
      if (typeof responseSize === 'number') {
        record.responseSize = responseSize;
      }
      active.delete(id);
      const allowed = performanceBudgetManager.reportNetworkUsage(appId, {
        responseBytes: responseSize,
        requestBytes: requestSize,
        duration: record.duration,
        description: `${method} ${url}`,
      });
      if (!allowed) {
        record.error = new Error('Network response blocked by performance budget');
        throw record.error;
      }
      notify('end', record);
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
