import { createLogger } from './logger';

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
  attempts?: number;
  lastError?: unknown;
}

export type FetchEntry = FetchLog;

const active = new Map<number, FetchLog>();
let counter = 0;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const log = createLogger();

const RECOVERABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 5000;

function bodySize(body: BodyInit | null | undefined): number | undefined {
  if (body == null) return 0;
  if (typeof body === 'string') return new TextEncoder().encode(body).length;
  if (body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return undefined;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_DELAY_MS);
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delay = date - Date.now();
    if (delay > 0) return Math.min(delay, MAX_DELAY_MS);
  }
  return null;
}

function getBackoffDelay(attempt: number, retryAfter?: string | null): number {
  const parsed = parseRetryAfter(retryAfter ?? null);
  if (parsed != null) return parsed;
  const expo = BASE_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(expo, MAX_DELAY_MS);
}

function shouldRetryStatus(status: number): boolean {
  return RECOVERABLE_STATUS_CODES.has(status);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
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
    const record: FetchLog = {
      id,
      url,
      method,
      startTime: now(),
      requestSize: init?.body ? bodySize(init.body) : undefined,
      attempts: 0,
    };
    active.set(id, record);
    notify('start', record);

    const finalizeSuccess = (response: Response) => {
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

      delete record.lastError;
      return response;
    };

    const finalizeError = (err: unknown) => {
      const end = now();
      record.endTime = end;
      record.duration = end - record.startTime;
      record.error = err;
      active.delete(id);
      notify('end', record);
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      record.attempts = attempt;
      try {
        const response = await originalFetch(input as any, init);
        record.status = response.status;

        if (shouldRetryStatus(response.status) && attempt < MAX_ATTEMPTS) {
          const delay = getBackoffDelay(attempt, response.headers.get('retry-after'));
          record.lastError = { status: response.status };
          console.warn('Fetch received recoverable status, retrying', {
            url,
            status: response.status,
            attempt,
            retryIn: delay,
          });
          log.warn('Fetch received recoverable status, retrying', {
            url,
            status: response.status,
            attempt,
            retryIn: delay,
          });
          await sleep(delay);
          continue;
        }

        if (shouldRetryStatus(response.status) && attempt === MAX_ATTEMPTS) {
          console.warn('Fetch returned recoverable status after max attempts', {
            url,
            status: response.status,
            attempts: attempt,
          });
          log.warn('Fetch returned recoverable status after max attempts', {
            url,
            status: response.status,
            attempts: attempt,
          });
        }

        return finalizeSuccess(response);
      } catch (err) {
        lastError = err;
        record.lastError = err;
        if (attempt === MAX_ATTEMPTS) {
          finalizeError(err);
          console.error('Fetch request failed after retries', {
            url,
            attempts: attempt,
            error: err,
          });
          log.error('Fetch request failed after retries', {
            url,
            attempts: attempt,
            error: err,
          });
          throw err;
        }
        const delay = getBackoffDelay(attempt);
        console.warn('Fetch attempt failed, retrying', {
          url,
          attempt,
          retryIn: delay,
          error: err,
        });
        log.warn('Fetch attempt failed, retrying', {
          url,
          attempt,
          retryIn: delay,
          error: err,
        });
        await sleep(delay);
      }
    }

    finalizeError(lastError);
    throw lastError ?? new Error('Fetch failed');
  };
}
