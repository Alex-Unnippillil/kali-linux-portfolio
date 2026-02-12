import type { ProxyDiagnosticHop } from '../lib/fetchProxy';

export interface ProxyChainHop {
  id: string;
  label: string;
}

export interface ProxyDiagnosticsOptions {
  baseLatency?: number;
  jitter?: number;
  failureRate?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal | null;
}

export interface ProxyDiagnosticsResult {
  startedAt: number;
  completedAt: number;
  totalLatency: number;
  success: boolean;
  hops: ProxyDiagnosticHop[];
}

interface InternalOptions extends Required<Omit<ProxyDiagnosticsOptions, 'signal'>> {
  signal?: AbortSignal | null;
}

const FAILURE_MESSAGES = [
  'Timeout detected',
  'Packet dropped upstream',
  'TLS negotiation stalled',
  'Proxy rejected handshake',
];

const SUCCESS_MESSAGES = ['Route verified', 'Chain healthy'];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ipFromSeed(seed: string): string {
  const hash = hashString(seed);
  const segment = (offset: number) => {
    const value = (hash >> offset) & 0xff;
    return Math.max(10, Math.min(250, value));
  };
  return `10.${segment(2)}.${segment(5)}.${segment(8)}`;
}

function resolveOptions(options: ProxyDiagnosticsOptions = {}): InternalOptions {
  return {
    baseLatency: options.baseLatency ?? 80,
    jitter: options.jitter ?? 60,
    failureRate: options.failureRate ?? 0.15,
    minDelayMs: options.minDelayMs ?? 18,
    maxDelayMs: options.maxDelayMs ?? 120,
    signal: options.signal ?? null,
  };
}

function createAbortError(): Error {
  const error = new Error('Diagnostics aborted');
  (error as any).name = 'AbortError';
  return error;
}

async function waitFor(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (!ms) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };
    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };
    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(createAbortError());
        return;
      }
      signal.addEventListener('abort', onAbort);
    }
  });
}

export async function runProxyDiagnostics(
  chain: ProxyChainHop[],
  options?: ProxyDiagnosticsOptions,
): Promise<ProxyDiagnosticsResult> {
  const { baseLatency, jitter, failureRate, minDelayMs, maxDelayMs, signal } = resolveOptions(options);
  const startedAt = Date.now();
  const hops: ProxyDiagnosticHop[] = [];
  let totalLatency = 0;
  let allPassed = true;
  const aggregateSeed = chain.map((hop) => hop.id).join('|') || 'default';
  const globalRandom = mulberry32(hashString(`${aggregateSeed}-global`));

  for (let index = 0; index < chain.length; index += 1) {
    if (signal?.aborted) {
      throw createAbortError();
    }
    const hop = chain[index];
    const seed = `${hop.id}-${hop.label}-${index}`;
    const random = mulberry32(hashString(seed));
    const ip = ipFromSeed(seed);
    const latency = baseLatency + Math.round(random() * jitter);
    const passed = random() > failureRate;
    totalLatency += latency;
    const messageSource = passed ? SUCCESS_MESSAGES : FAILURE_MESSAGES;
    const messageIndex = Math.floor(random() * messageSource.length);
    const message = messageSource[messageIndex] || (passed ? 'OK' : 'Error');
    hops.push({
      id: hop.id,
      label: hop.label,
      ip,
      latency,
      passed,
      message,
    });
    if (!passed) {
      allPassed = false;
    }
    const delayBase = Math.max(minDelayMs, Math.min(maxDelayMs, Math.round(latency * globalRandom())));
    await waitFor(delayBase, signal);
  }

  const completedAt = Date.now();
  return {
    startedAt,
    completedAt,
    totalLatency,
    success: allPassed,
    hops,
  };
}

export interface FormatDiagnosticsOptions {
  chain?: string[];
  target?: string;
}

export function formatProxyDiagnostics(
  result: ProxyDiagnosticsResult,
  { chain, target }: FormatDiagnosticsOptions = {},
): string {
  const lines: string[] = [
    'Proxy Chain Diagnostic Report',
    `Status: ${result.success ? 'PASS' : 'FAIL'}`,
    `Started: ${new Date(result.startedAt).toISOString()}`,
    `Completed: ${new Date(result.completedAt).toISOString()}`,
    `Total Latency: ${Math.round(result.totalLatency)} ms`,
  ];

  if (chain?.length) {
    lines.push(`Chain: ${chain.join(' -> ')}`);
  }

  if (target) {
    lines.push(`Target: ${target}`);
  }

  lines.push('', 'Hop Details:');
  if (result.hops.length === 0) {
    lines.push('- No hops available');
  } else {
    result.hops.forEach((hop, index) => {
      const status = hop.passed ? 'PASS' : 'FAIL';
      const latency = Math.round(hop.latency);
      const detail = hop.message ? ` – ${hop.message}` : '';
      lines.push(`${index + 1}. ${hop.label} [${hop.ip}] — ${status} (${latency} ms${detail})`);
    });
  }

  return lines.join('\n');
}
