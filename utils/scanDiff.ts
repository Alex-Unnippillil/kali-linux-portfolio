export interface PortService {
  port: number;
  service: string;
}

export interface DiffOptions {
  ignoreEphemeral?: boolean;
  normalizeService?: (name: string) => string;
  ephemeralStart?: number;
}

export interface DiffResult {
  added: PortService[];
  removed: PortService[];
  changed: { port: number; from: string; to: string }[];
}

const aliasMap: Record<string, string> = {
  'www': 'http',
  'www-http': 'http',
  'http-alt': 'http',
  'ssl/http': 'https',
};

export const normalizeServiceName = (name: string): string => {
  const clean = name.toLowerCase().trim();
  return aliasMap[clean] || clean;
};

export function diffScans(
  left: PortService[],
  right: PortService[],
  opts: DiffOptions = {},
): DiffResult {
  const {
    ignoreEphemeral = false,
    normalizeService,
    ephemeralStart = 49152,
  } = opts;

  const norm = (s: string) =>
    normalizeService ? normalizeService(s) : s.toLowerCase();

  const filter = (entries: PortService[]) =>
    ignoreEphemeral ? entries.filter((e) => e.port < ephemeralStart) : entries;

  const a = filter(left).map((e) => ({ port: e.port, service: norm(e.service) }));
  const b = filter(right).map((e) => ({ port: e.port, service: norm(e.service) }));

  const mapA = new Map<number, string>(a.map((e) => [e.port, e.service]));
  const mapB = new Map<number, string>(b.map((e) => [e.port, e.service]));

  const added: PortService[] = [];
  const removed: PortService[] = [];
  const changed: { port: number; from: string; to: string }[] = [];

  for (const [port, service] of mapB) {
    if (!mapA.has(port)) {
      added.push({ port, service });
    } else if (mapA.get(port) !== service) {
      changed.push({ port, from: mapA.get(port)! , to: service });
    }
  }

  for (const [port, service] of mapA) {
    if (!mapB.has(port)) {
      removed.push({ port, service });
    }
  }

  return { added, removed, changed };
}

