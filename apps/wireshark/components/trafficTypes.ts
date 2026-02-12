export interface Packet {
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
  length: number;
}

export interface TrafficAggregate {
  address: string;
  packets: number;
  bytes: number;
}

export interface TrafficSummary {
  sources: TrafficAggregate[];
  destinations: TrafficAggregate[];
}
