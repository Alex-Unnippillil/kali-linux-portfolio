import { createSeededRandom, SeededRandom } from './random';

export type LogLevel = 'info' | 'warn' | 'error';

export interface FakeLogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface LogGeneratorOptions {
  seed?: string | number;
  startTime?: number | Date;
  minStepMs?: number;
  maxStepMs?: number;
}

export interface GenerateLogsOptions extends LogGeneratorOptions {
  count?: number;
}

export const DEFAULT_LOG_SEED = 'ettercap-demo';
const DEFAULT_START_TIME = Date.UTC(2025, 9, 1, 2, 50, 32);

interface TemplateContext {
  rng: SeededRandom;
  source: string;
  target: string;
  gateway: string;
  iface: string;
  session: string;
  requestId: string;
}

interface TemplateDefinition {
  level: LogLevel;
  render(ctx: TemplateContext): string;
}

const SOURCES = [
  'arp-spoof',
  'dns-hijack',
  'session-watch',
  'credential-harvest',
  'packet-sniffer',
];

const TARGET_BLOCKS = ['10.0.5', '192.168.56', '172.16.42'];
const GATEWAYS = ['10.0.5.1', '192.168.56.1', '172.16.42.1'];
const INTERFACES = ['eth0', 'wlan0', 'tap0', 'bridge0'];
const SESSION_PREFIXES = ['mitm', 'audit', 'lab', 'demo'];
const REQUEST_PREFIXES = ['req', 'flow', 'trace'];

const templates: TemplateDefinition[] = [
  {
    level: 'info',
    render: ({ target, gateway, iface, session }) =>
      `redirected ${target} through ${gateway} on ${iface} (session ${session})`,
  },
  {
    level: 'info',
    render: ({ source, target, requestId }) =>
      `${source} relayed ${requestId} for ${target} with checksum ok`,
  },
  {
    level: 'info',
    render: ({ source, iface }) => `${source} captured 12 packets on ${iface} buffer`,
  },
  {
    level: 'warn',
    render: ({ target, gateway }) =>
      `detected ARP refresh from ${target}; reaffirmed poisoning against ${gateway}`,
  },
  {
    level: 'warn',
    render: ({ target, iface }) =>
      `slow TLS negotiation observed from ${target} on ${iface}; throttled stream`,
  },
  {
    level: 'error',
    render: ({ target, iface }) =>
      `dropped unstable host ${target} after repeated retries on ${iface}`,
  },
  {
    level: 'error',
    render: ({ source, requestId }) =>
      `${source} failed to forward ${requestId}; queued for replay`,
  },
];

const clampStep = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createContext = (rng: SeededRandom): TemplateContext => {
  const target = `${rng.pick(TARGET_BLOCKS)}.${rng.int(2, 254)}`;
  return {
    rng,
    source: rng.pick(SOURCES),
    target,
    gateway: rng.pick(GATEWAYS),
    iface: rng.pick(INTERFACES),
    session: `${rng.pick(SESSION_PREFIXES)}-${rng.int(1000, 9999)}`,
    requestId: `${rng.pick(REQUEST_PREFIXES)}-${rng.int(100000, 999999)}`,
  };
};

const renderMessage = (template: TemplateDefinition, ctx: TemplateContext) =>
  template.render(ctx);

export const formatLogEntry = (entry: FakeLogEntry) =>
  `${entry.timestamp} ${entry.source}: ${entry.message}`;

export const createLogGenerator = (
  options: LogGeneratorOptions = {}
): (() => FakeLogEntry) => {
  const {
    seed = DEFAULT_LOG_SEED,
    startTime = DEFAULT_START_TIME,
    minStepMs = 750,
    maxStepMs = 3200,
  } = options;
  const rng = createSeededRandom(seed);
  const baseTime =
    typeof startTime === 'number' ? startTime : startTime.getTime();
  let currentTime = baseTime;
  let index = 0;

  return () => {
    const template = rng.pick(templates);
    const ctx = createContext(rng);
    const timestamp = new Date(currentTime).toISOString();
    const message = renderMessage(template, ctx);
    const entry: FakeLogEntry = {
      id: baseTime + index,
      timestamp,
      level: template.level,
      source: ctx.source,
      message,
    };
    index += 1;
    const step = clampStep(rng.int(minStepMs, maxStepMs), minStepMs, maxStepMs);
    currentTime += step;
    return entry;
  };
};

export const generateLogs = (
  options: GenerateLogsOptions = {}
): FakeLogEntry[] => {
  const { count = 10 } = options;
  const generator = createLogGenerator(options);
  return Array.from({ length: count }, () => generator());
};
