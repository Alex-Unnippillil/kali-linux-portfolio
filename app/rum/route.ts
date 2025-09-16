import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_METRICS_PATH = path.join(process.cwd(), 'data', 'rum-metrics.json');
const MAX_METRICS = 200;
const metricsPath = process.env.RUM_METRICS_PATH || DEFAULT_METRICS_PATH;

interface StoredMetric {
  id: string;
  name: string;
  value: number;
  label?: string;
  startTime?: number;
  timestamp: number;
  attribution?: Record<string, string | number>;
}

type RawMetric = Record<string, unknown> | null;

class MemoryHeaders {
  private readonly store = new Map<string, string>();

  constructor(init?: HeadersInit) {
    if (!init) return;
    if (Array.isArray(init)) {
      for (const [key, value] of init) {
        this.set(key, value);
      }
      return;
    }
    if (init instanceof Map) {
      for (const [key, value] of init) {
        this.set(key, String(value));
      }
      return;
    }
    for (const [key, value] of Object.entries(init)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          this.set(key, String(item));
        }
      } else if (value !== undefined) {
        this.set(key, String(value));
      }
    }
  }

  set(name: string, value: string) {
    this.store.set(name.toLowerCase(), value);
  }

  has(name: string) {
    return this.store.has(name.toLowerCase());
  }

  get(name: string) {
    return this.store.get(name.toLowerCase()) ?? null;
  }
}

class MemoryResponse {
  status: number;
  headers: MemoryHeaders;
  private readonly body: string;

  constructor(body: string, init: ResponseInit = {}) {
    this.status = init.status ?? 200;
    if (init.headers instanceof MemoryHeaders) {
      this.headers = init.headers;
    } else {
      this.headers = new MemoryHeaders(init.headers as HeadersInit | undefined);
    }
    this.body = body;
  }

  async json() {
    return this.body ? JSON.parse(this.body) : null;
  }

  async text() {
    return this.body;
  }
}

function sanitizeMetric(raw: RawMetric): StoredMetric | null {
  if (!raw || typeof raw !== 'object') return null;

  const { id, name, value, label, startTime, timestamp, attribution } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || typeof name !== 'string') return null;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const sanitized: StoredMetric = {
    id: id.slice(0, 100),
    name: name.slice(0, 50),
    value: numericValue,
    timestamp:
      typeof timestamp === 'number' && Number.isFinite(timestamp)
        ? timestamp
        : Date.now(),
  };

  if (typeof label === 'string') {
    sanitized.label = label.slice(0, 50);
  }

  if (typeof startTime === 'number' && Number.isFinite(startTime)) {
    sanitized.startTime = startTime;
  }

  if (attribution && typeof attribution === 'object') {
    const allowedKeys = [
      'event',
      'eventTarget',
      'eventType',
      'navigationType',
      'nextUrl',
      'previousUrl',
      'largestShiftTarget',
      'largestShiftValue',
      'rating',
      'timeToFirstByte',
    ];
    const safeAttribution: Record<string, string | number> = {};

    for (const key of allowedKeys) {
      const rawValue = (attribution as Record<string, unknown>)[key];
      if (typeof rawValue === 'string') {
        safeAttribution[key] = rawValue.slice(0, 200);
      } else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        safeAttribution[key] = rawValue;
      }
    }

    if (Object.keys(safeAttribution).length > 0) {
      sanitized.attribution = safeAttribution;
    }
  }

  return sanitized;
}

async function readMetrics(): Promise<StoredMetric[]> {
  try {
    const raw = await fs.readFile(metricsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredMetric[]) : [];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
    }
    console.error('Failed to read RUM metrics', error);
    return [];
  }
}

async function writeMetrics(metrics: StoredMetric[]): Promise<void> {
  await fs.mkdir(path.dirname(metricsPath), { recursive: true });
  await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headersInstance =
    typeof Headers !== 'undefined'
      ? new Headers(init.headers)
      : new MemoryHeaders(init.headers as HeadersInit | undefined);

  if (!headersInstance.has('Content-Type')) {
    headersInstance.set('Content-Type', 'application/json');
  }
  if (!headersInstance.has('Cache-Control')) {
    headersInstance.set('Cache-Control', 'no-store');
  }

  if (typeof Response !== 'undefined') {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: headersInstance as HeadersInit,
    });
  }

  return new MemoryResponse(JSON.stringify(body), {
    ...init,
    headers: headersInstance as MemoryHeaders,
  }) as unknown as Response;
}

export async function POST(req: Request): Promise<Response> {
  let payloadText = '';
  try {
    payloadText = await req.text();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  let data: RawMetric;
  try {
    data = payloadText ? (JSON.parse(payloadText) as RawMetric) : null;
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const metric = sanitizeMetric(data);
  if (!metric) {
    return jsonResponse({ ok: false, error: 'invalid_metric' }, { status: 400 });
  }

  const metrics = await readMetrics();
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }

  try {
    await writeMetrics(metrics);
  } catch (error) {
    console.error('Failed to persist RUM metric', error);
    return jsonResponse({ ok: false, error: 'write_failed' }, { status: 500 });
  }

  return jsonResponse({ ok: true });
}

export async function GET(): Promise<Response> {
  const metrics = await readMetrics();
  return jsonResponse({ metrics });
}

export { sanitizeMetric };
