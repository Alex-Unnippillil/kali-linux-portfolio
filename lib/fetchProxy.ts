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

export interface ProxyDiagnosticHop {
  id: string;
  label: string;
  ip: string;
  latency: number;
  passed: boolean;
  message?: string;
}

export interface ProxyDiagnosticLog {
  id: number;
  startedAt: number;
  completedAt: number;
  totalLatency: number;
  success: boolean;
  chain: string[];
  hops: ProxyDiagnosticHop[];
  error?: string;
}

const active = new Map<number, FetchLog>();
let counter = 0;
const diagnostics: ProxyDiagnosticLog[] = [];
let diagnosticCounter = 0;

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

function notifyDiagnostic(record: ProxyDiagnosticLog) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fetchproxy-diagnostic', { detail: record }));
  }
}

export function logProxyDiagnostic(entry: Omit<ProxyDiagnosticLog, 'id'>): ProxyDiagnosticLog {
  const record: ProxyDiagnosticLog = { ...entry, id: ++diagnosticCounter };
  diagnostics.push(record);
  if (diagnostics.length > 100) diagnostics.shift();
  notifyDiagnostic(record);
  return record;
}

export function getProxyDiagnostics(): ProxyDiagnosticLog[] {
  return diagnostics.slice();
}

export function onProxyDiagnostic(
  handler: (e: CustomEvent<ProxyDiagnosticLog>) => void,
) {
  if (typeof window !== 'undefined') {
    window.addEventListener('fetchproxy-diagnostic', handler as EventListener);
    return () => window.removeEventListener('fetchproxy-diagnostic', handler as EventListener);
  }
  return () => {};
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

      const finalize = (size?: number) => {
        if (typeof size === 'number') record.responseSize = size;
        active.delete(id);
        notify('end', record);
      };

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        finalize(Number(contentLength));
      } else if (
        typeof (response as any).clone === 'function' &&
        typeof (response as any).arrayBuffer === 'function'
      ) {
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
