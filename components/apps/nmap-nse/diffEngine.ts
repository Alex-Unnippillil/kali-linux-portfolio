export interface PortRecord {
  port: number;
  protocol: string;
  state: string;
  service?: string;
  product?: string;
  reason?: string;
}

export interface HostRecord {
  address: string;
  hostname?: string;
  ports: PortRecord[];
}

export interface DiffServiceEntry {
  host: string;
  hostname?: string;
  port: number;
  protocol: string;
  state: string;
  service?: string;
  product?: string;
}

export interface DiffStateChangeEntry extends DiffServiceEntry {
  fromState: string;
  toState: string;
}

export interface DiffResult {
  newServices: DiffServiceEntry[];
  lostServices: DiffServiceEntry[];
  stateChanges: DiffStateChangeEntry[];
}

export interface DiffRequest {
  baseHosts: HostRecord[];
  targetHosts: HostRecord[];
}

const emptyResult: DiffResult = {
  newServices: [],
  lostServices: [],
  stateChanges: [],
};

function normalizeState(state?: string) {
  return (state || '').trim().toLowerCase() || 'unknown';
}

function portKey(port: PortRecord) {
  return `${port.protocol || 'tcp'}:${port.port}`;
}

function indexHosts(hosts: HostRecord[]) {
  const map = new Map<string, HostRecord>();
  for (const host of hosts) {
    if (!host || !host.address) continue;
    map.set(host.address, {
      ...host,
      ports: Array.isArray(host.ports) ? host.ports : [],
    });
  }
  return map;
}

function indexPorts(host: HostRecord | undefined) {
  const map = new Map<string, PortRecord>();
  if (!host) return map;
  const ports = Array.isArray(host.ports) ? host.ports : [];
  for (const port of ports) {
    if (typeof port?.port !== 'number') continue;
    const key = portKey(port);
    map.set(key, {
      port: port.port,
      protocol: port.protocol || 'tcp',
      state: port.state || 'unknown',
      service: port.service,
      product: port.product,
      reason: port.reason,
    });
  }
  return map;
}

function sortServices<T extends DiffServiceEntry>(values: T[]) {
  return values.sort((a, b) => {
    const host = a.host.localeCompare(b.host);
    if (host !== 0) return host;
    if (a.port !== b.port) return a.port - b.port;
    return a.protocol.localeCompare(b.protocol);
  });
}

export function computeDiff(request: DiffRequest): DiffResult {
  const baseMap = indexHosts(request.baseHosts || []);
  const targetMap = indexHosts(request.targetHosts || []);
  const hosts = new Set<string>([
    ...Array.from(baseMap.keys()),
    ...Array.from(targetMap.keys()),
  ]);

  const result: DiffResult = {
    newServices: [],
    lostServices: [],
    stateChanges: [],
  };

  for (const hostAddress of hosts) {
    const baseHost = baseMap.get(hostAddress);
    const targetHost = targetMap.get(hostAddress);
    const basePorts = indexPorts(baseHost);
    const targetPorts = indexPorts(targetHost);
    const hostname = targetHost?.hostname || baseHost?.hostname;

    const portKeys = new Set<string>([
      ...Array.from(basePorts.keys()),
      ...Array.from(targetPorts.keys()),
    ]);

    for (const key of portKeys) {
      const basePort = basePorts.get(key);
      const targetPort = targetPorts.get(key);

      if (!basePort && targetPort) {
        result.newServices.push({
          host: hostAddress,
          hostname,
          port: targetPort.port,
          protocol: targetPort.protocol,
          state: targetPort.state,
          service: targetPort.service,
          product: targetPort.product,
        });
        continue;
      }

      if (basePort && !targetPort) {
        result.lostServices.push({
          host: hostAddress,
          hostname,
          port: basePort.port,
          protocol: basePort.protocol,
          state: basePort.state,
          service: basePort.service,
          product: basePort.product,
        });
        continue;
      }

      if (basePort && targetPort) {
        const baseState = normalizeState(basePort.state);
        const targetState = normalizeState(targetPort.state);
        if (baseState !== targetState) {
          result.stateChanges.push({
            host: hostAddress,
            hostname,
            port: basePort.port,
            protocol: basePort.protocol,
            state: targetPort.state,
            service: targetPort.service || basePort.service,
            product: targetPort.product || basePort.product,
            fromState: basePort.state || 'unknown',
            toState: targetPort.state || 'unknown',
          });
        }
      }
    }
  }

  return {
    newServices: sortServices(result.newServices),
    lostServices: sortServices(result.lostServices),
    stateChanges: sortServices(result.stateChanges),
  };
}

export function mergeDiffResults(results: DiffResult[]): DiffResult {
  if (!Array.isArray(results) || results.length === 0) {
    return structuredClone(emptyResult);
  }
  const aggregate: DiffResult = {
    newServices: [],
    lostServices: [],
    stateChanges: [],
  };
  for (const item of results) {
    if (!item) continue;
    aggregate.newServices.push(...(item.newServices || []));
    aggregate.lostServices.push(...(item.lostServices || []));
    aggregate.stateChanges.push(...(item.stateChanges || []));
  }

  return {
    newServices: sortServices(aggregate.newServices),
    lostServices: sortServices(aggregate.lostServices),
    stateChanges: sortServices(aggregate.stateChanges),
  };
}

export function emptyDiff(): DiffResult {
  return structuredClone(emptyResult);
}
