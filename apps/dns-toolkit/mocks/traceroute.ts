export type CoordinatePair = [number, number];

export interface TracerouteHop {
  id: number;
  label: string;
  location: string;
  ip: string;
  coordinates: CoordinatePair;
  baseLatency: number;
  jitter: number;
}

export interface TracerouteFrame {
  frame: number;
  hopIndex: number;
  hop: TracerouteHop;
  latency: number;
  cumulativeLatency: number;
  latencies: number[];
}

export const TRACEROUTE_HOPS: TracerouteHop[] = [
  {
    id: 1,
    label: 'Gateway — Seattle',
    location: 'Seattle, USA',
    ip: '203.0.113.1',
    coordinates: [47.6062, -122.3321],
    baseLatency: 12,
    jitter: 4.5,
  },
  {
    id: 2,
    label: 'Edge Router — Los Angeles',
    location: 'Los Angeles, USA',
    ip: '203.0.113.5',
    coordinates: [34.0522, -118.2437],
    baseLatency: 18,
    jitter: 6,
  },
  {
    id: 3,
    label: 'Pacific Exchange — Honolulu',
    location: 'Honolulu, USA',
    ip: '198.51.100.12',
    coordinates: [21.3069, -157.8583],
    baseLatency: 62,
    jitter: 9,
  },
  {
    id: 4,
    label: 'Transpacific Relay — Tokyo',
    location: 'Tokyo, Japan',
    ip: '198.51.100.42',
    coordinates: [35.6762, 139.6503],
    baseLatency: 124,
    jitter: 14,
  },
  {
    id: 5,
    label: 'ASE Transit — Singapore',
    location: 'Singapore',
    ip: '203.0.113.78',
    coordinates: [1.3521, 103.8198],
    baseLatency: 178,
    jitter: 16,
  },
  {
    id: 6,
    label: 'Oceania Uplink — Sydney',
    location: 'Sydney, Australia',
    ip: '203.0.113.102',
    coordinates: [-33.8688, 151.2093],
    baseLatency: 235,
    jitter: 18,
  },
  {
    id: 7,
    label: 'European Exchange — Frankfurt',
    location: 'Frankfurt, Germany',
    ip: '198.51.100.200',
    coordinates: [50.1109, 8.6821],
    baseLatency: 305,
    jitter: 22,
  },
];

export function createTracerouteLatencyGenerator(seed = 0): Generator<TracerouteFrame, never, unknown> {
  let frame = 0;
  const latencies = new Array(TRACEROUTE_HOPS.length).fill(0);
  const jitterSeed = Math.abs(seed % 997) / 997;

  return (function* () {
    while (true) {
      const hopIndex = frame % TRACEROUTE_HOPS.length;
      const hop = TRACEROUTE_HOPS[hopIndex];
      const phase = frame + hopIndex + jitterSeed * 13;
      const variation = Math.abs(Math.sin(phase * 0.9));
      const latency = Number((hop.baseLatency + variation * hop.jitter).toFixed(1));
      latencies[hopIndex] = latency;

      const cumulativeLatency = Number(
        latencies.slice(0, hopIndex + 1).reduce((sum, value) => sum + value, 0).toFixed(1)
      );

      frame += 1;

      yield {
        frame,
        hopIndex,
        hop,
        latency,
        cumulativeLatency,
        latencies: [...latencies],
      } satisfies TracerouteFrame;
    }
  })();
}
