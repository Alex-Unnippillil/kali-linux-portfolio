export type NetworkProfile = {
  id: string;
  label: string;
  latency: number; // milliseconds
  downloadKbps: number;
  uploadKbps: number;
  offline?: boolean;
  custom?: boolean;
  description?: string;
};

export type NetworkPreset = NetworkProfile;
export const CUSTOM_PROFILE_ID = 'custom';

export type CustomNetworkSettings = Pick<NetworkProfile, 'latency' | 'downloadKbps' | 'uploadKbps'>;

type TransferDirection = 'download' | 'upload';

type NetworkRequestType = 'document' | 'stylesheet' | 'script' | 'image' | 'font' | 'xhr';

export type NetworkRequest = {
  id: string;
  label: string;
  method?: 'GET' | 'POST';
  type: NetworkRequestType;
  sizeKB: number;
  baseLatency?: number;
  direction?: TransferDirection;
};

export type RequestTimelineEntry = {
  id: string;
  label: string;
  method: 'GET' | 'POST';
  type: NetworkRequestType;
  sizeKB: number;
  status: 'success' | 'blocked';
  latency: number;
  transfer: number;
  total: number;
  start: number;
};

const formatNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

export const formatLatency = (latency: number) => `${Math.round(latency)} ms`;

export const formatBandwidth = (kbps: number) => {
  if (!Number.isFinite(kbps) || kbps <= 0) {
    return '∞';
  }
  if (kbps >= 1000) {
    return `${formatNumber.format(kbps / 1000)} Mbps`;
  }
  return `${Math.round(kbps)} Kbps`;
};

export const DEFAULT_PROFILE: NetworkProfile = {
  id: 'no-throttle',
  label: 'No throttling',
  latency: 0,
  downloadKbps: Number.POSITIVE_INFINITY,
  uploadKbps: Number.POSITIVE_INFINITY,
  offline: false,
  custom: false,
  description: 'Realtime network without artificial throttling.',
};

export const NETWORK_PRESETS: NetworkPreset[] = [
  {
    id: 'fast-3g',
    label: 'Fast 3G',
    latency: 150,
    downloadKbps: 1600,
    uploadKbps: 750,
    custom: false,
    description: '150 ms RTT, 1.6 Mbps down, 750 Kbps up.',
  },
  {
    id: 'slow-3g',
    label: 'Slow 3G',
    latency: 400,
    downloadKbps: 400,
    uploadKbps: 400,
    custom: false,
    description: '400 ms RTT, 400 Kbps down/up.',
  },
];

export const DEFAULT_CUSTOM_SETTINGS: CustomNetworkSettings = {
  latency: NETWORK_PRESETS[0].latency,
  downloadKbps: NETWORK_PRESETS[0].downloadKbps,
  uploadKbps: NETWORK_PRESETS[0].uploadKbps,
};

export const FIREFOX_BASE_REQUESTS: NetworkRequest[] = [
  {
    id: 'document',
    label: '/',
    method: 'GET',
    type: 'document',
    sizeKB: 320,
    baseLatency: 40,
  },
  {
    id: 'stylesheet',
    label: '/assets/app.css',
    method: 'GET',
    type: 'stylesheet',
    sizeKB: 120,
    baseLatency: 30,
  },
  {
    id: 'script',
    label: '/assets/vendor.js',
    method: 'GET',
    type: 'script',
    sizeKB: 520,
    baseLatency: 60,
  },
  {
    id: 'image',
    label: '/media/hero.webp',
    method: 'GET',
    type: 'image',
    sizeKB: 260,
    baseLatency: 25,
  },
  {
    id: 'font',
    label: '/fonts/brand.woff2',
    method: 'GET',
    type: 'font',
    sizeKB: 180,
    baseLatency: 35,
  },
  {
    id: 'analytics',
    label: '/api/collect',
    method: 'POST',
    type: 'xhr',
    sizeKB: 8,
    baseLatency: 120,
    direction: 'upload',
  },
];

export const createRequestsForUrl = (url: string): NetworkRequest[] => {
  try {
    const target = new URL(url);
    const origin = target.origin;
    const documentPath = `${origin}${target.pathname || '/'}`;

    return FIREFOX_BASE_REQUESTS.map((request) => {
      if (request.id === 'document') {
        return { ...request, label: documentPath };
      }

      const resolved = new URL(request.label, origin);
      return { ...request, label: resolved.href };
    });
  } catch {
    return FIREFOX_BASE_REQUESTS.map((request) => ({ ...request }));
  }
};

const getDirection = (request: NetworkRequest): TransferDirection => request.direction ?? 'download';

const toTimelineEntry = (
  profile: NetworkProfile,
  request: NetworkRequest,
  start: number,
): RequestTimelineEntry => {
  if (profile.offline) {
    return {
      id: request.id,
      label: request.label,
      method: request.method ?? 'GET',
      type: request.type,
      sizeKB: request.sizeKB,
      status: 'blocked',
      latency: profile.latency + (request.baseLatency ?? 0),
      transfer: 0,
      total: 0,
      start,
    };
  }

  const baseLatency = request.baseLatency ?? 0;
  const direction = getDirection(request);
  const throughput = direction === 'upload' ? profile.uploadKbps : profile.downloadKbps;

  const transfer = !Number.isFinite(throughput)
    ? 0
    : Math.max(0, ((request.sizeKB * 8) / throughput) * 1000);

  const latency = profile.latency + baseLatency;
  const total = latency + transfer;

  return {
    id: request.id,
    label: request.label,
    method: request.method ?? 'GET',
    type: request.type,
    sizeKB: request.sizeKB,
    status: 'success',
    latency,
    transfer,
    total,
    start,
  };
};

export const computeTimeline = (
  profile: NetworkProfile,
  requests: NetworkRequest[],
): RequestTimelineEntry[] => {
  let cursor = 0;
  return requests.map((request) => {
    const entry = toTimelineEntry(profile, request, cursor);
    cursor += entry.total;
    return entry;
  });
};

export const describeProfile = (profile: NetworkProfile) => {
  if (profile.offline) {
    return 'Offline (all requests blocked)';
  }

  if (!profile.custom && profile.id === DEFAULT_PROFILE.id) {
    return 'No throttling applied';
  }

  const label = profile.custom ? 'Custom profile' : profile.label;
  const latency = formatLatency(profile.latency);
  const download = formatBandwidth(profile.downloadKbps);
  const upload = formatBandwidth(profile.uploadKbps);

  return `${label} • ${latency} • ${download} down / ${upload} up`;
};

export const formatDuration = (duration: number) => {
  if (!Number.isFinite(duration)) {
    return '∞';
  }
  if (duration >= 1000) {
    return `${formatNumber.format(duration / 1000)} s`;
  }
  return `${Math.round(duration)} ms`;
};
