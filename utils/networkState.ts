import { safeLocalStorage } from './safeStorage';

export type RouteEntry = {
  id: string;
  destination: string;
  netmask: string;
  gateway: string;
  metric: string;
};

export type NetworkAdapter = {
  id: string;
  name: string;
  type: 'ethernet' | 'wifi' | 'vpn';
  status: 'connected' | 'disconnected';
  ipv4: string;
  gateway: string;
  dns: string[];
  mac: string;
  routes: RouteEntry[];
  searchDomains: string[];
};

type PersistedConfig = Record<string, { routes: RouteEntry[]; searchDomains: string[] }>;

const STORAGE_KEY = 'networking.adapters';

const baseAdapters: NetworkAdapter[] = [
  {
    id: 'eth0',
    name: 'Wired Connection (eth0)',
    type: 'ethernet',
    status: 'connected',
    ipv4: '192.168.56.101',
    gateway: '192.168.56.1',
    dns: ['1.1.1.1', '8.8.8.8'],
    mac: '00:1A:2B:3C:4D:5E',
    routes: [
      {
        id: 'eth0-default',
        destination: '0.0.0.0',
        netmask: '0.0.0.0',
        gateway: '192.168.56.1',
        metric: '100',
      },
      {
        id: 'eth0-lab',
        destination: '10.10.0.0',
        netmask: '255.255.0.0',
        gateway: '192.168.56.5',
        metric: '50',
      },
    ],
    searchDomains: ['corp.example', 'lab.local'],
  },
  {
    id: 'wlan0',
    name: 'Wireless (wlan0)',
    type: 'wifi',
    status: 'connected',
    ipv4: '10.0.0.42',
    gateway: '10.0.0.1',
    dns: ['9.9.9.9', '149.112.112.112'],
    mac: '00:5E:60:AF:12:34',
    routes: [
      {
        id: 'wlan0-default',
        destination: '0.0.0.0',
        netmask: '0.0.0.0',
        gateway: '10.0.0.1',
        metric: '100',
      },
    ],
    searchDomains: ['home.lab'],
  },
];

let memoryOverrides: PersistedConfig | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cloneRoute = (route: RouteEntry): RouteEntry => ({ ...route });

const readPersistedConfig = (): PersistedConfig => {
  if (memoryOverrides) {
    return { ...memoryOverrides };
  }
  if (!safeLocalStorage) {
    memoryOverrides = {};
    return {};
  }
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryOverrides = {};
      return {};
    }
    const parsed = JSON.parse(raw) as PersistedConfig;
    memoryOverrides = parsed;
    return { ...parsed };
  } catch (err) {
    console.warn('Unable to parse networking state from storage', err);
    memoryOverrides = {};
    return {};
  }
};

const writePersistedConfig = (config: PersistedConfig) => {
  memoryOverrides = { ...config };
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Unable to persist networking state', err);
  }
};

const mergeAdapter = (adapter: NetworkAdapter, override?: { routes: RouteEntry[]; searchDomains: string[] }): NetworkAdapter => ({
  ...adapter,
  routes: override?.routes ? override.routes.map(cloneRoute) : adapter.routes.map(cloneRoute),
  searchDomains: override?.searchDomains ? [...override.searchDomains] : [...adapter.searchDomains],
  dns: [...adapter.dns],
});

const ipv4Pattern =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

const domainPattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;

const createRouteId = () => `route-${Math.random().toString(36).slice(2, 9)}`;

export const createEmptyRoute = (): RouteEntry => ({
  id: createRouteId(),
  destination: '',
  netmask: '',
  gateway: '',
  metric: '100',
});

export const loadNetworkAdapters = (): NetworkAdapter[] => {
  const overrides = readPersistedConfig();
  return baseAdapters.map((adapter) => mergeAdapter(adapter, overrides[adapter.id]));
};

type AdapterConfig = {
  routes: RouteEntry[];
  searchDomains: string[];
};

const normalizeRoutes = (routes: RouteEntry[]): RouteEntry[] =>
  routes.map((route) => ({
    id: route.id || createRouteId(),
    destination: route.destination.trim(),
    netmask: route.netmask.trim(),
    gateway: route.gateway.trim(),
    metric: route.metric.trim(),
  }));

const normalizeDomains = (domains: string[]): string[] =>
  domains.map((domain) => domain.trim()).filter((domain) => domain.length > 0);

const validateConfig = (config: AdapterConfig): string | null => {
  if (config.routes.length === 0) {
    return 'Add at least one route before applying changes.';
  }
  for (const route of config.routes) {
    if (!route.destination || !route.netmask || !route.gateway) {
      return 'Routes must include destination, netmask, and gateway.';
    }
    if (!ipv4Pattern.test(route.destination)) {
      return `Destination ${route.destination} is not a valid IPv4 address.`;
    }
    if (!ipv4Pattern.test(route.netmask)) {
      return `Netmask ${route.netmask} is not a valid IPv4 address.`;
    }
    if (!ipv4Pattern.test(route.gateway)) {
      return `Gateway ${route.gateway} is not a valid IPv4 address.`;
    }
    const metricValue = Number(route.metric);
    if (!Number.isFinite(metricValue) || metricValue < 0) {
      return `Metric for route ${route.destination} must be a positive number.`;
    }
  }
  for (const domain of config.searchDomains) {
    if (!domainPattern.test(domain)) {
      return `Search domain ${domain} is not valid.`;
    }
  }
  return null;
};

export const applyAdapterConfig = async (
  adapterId: string,
  config: AdapterConfig
): Promise<
  | { success: true; adapter: NetworkAdapter }
  | { success: false; message: string }
> => {
  const base = baseAdapters.find((adapter) => adapter.id === adapterId);
  if (!base) {
    await wait(150);
    return { success: false, message: 'Adapter not found.' };
  }

  const normalizedRoutes = normalizeRoutes(config.routes);
  const normalizedDomains = normalizeDomains(config.searchDomains);

  const error = validateConfig({ routes: normalizedRoutes, searchDomains: normalizedDomains });
  if (error) {
    await wait(200);
    return { success: false, message: error };
  }

  const overrides = readPersistedConfig();
  overrides[adapterId] = {
    routes: normalizedRoutes.map(cloneRoute),
    searchDomains: [...normalizedDomains],
  };
  writePersistedConfig(overrides);

  await wait(300);

  return {
    success: true,
    adapter: mergeAdapter(base, overrides[adapterId]),
  };
};

export const resetNetworkConfig = () => {
  memoryOverrides = {};
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear networking state', err);
  }
};

export type { AdapterConfig };
