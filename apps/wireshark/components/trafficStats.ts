import type { Packet, TrafficAggregate, TrafficSummary } from './trafficTypes';

const sortAggregates = (values: Map<string, TrafficAggregate>): TrafficAggregate[] => {
  return Array.from(values.values()).sort((a, b) => {
    if (b.bytes !== a.bytes) return b.bytes - a.bytes;
    if (b.packets !== a.packets) return b.packets - a.packets;
    return a.address.localeCompare(b.address);
  });
};

const increment = (
  aggregates: Map<string, TrafficAggregate>,
  key: string,
  size: number
) => {
  if (!key) return;
  const current = aggregates.get(key) ?? { address: key, packets: 0, bytes: 0 };
  current.packets += 1;
  current.bytes += size;
  aggregates.set(key, current);
};

export const aggregateTraffic = (packets: Packet[]): TrafficSummary => {
  const sources = new Map<string, TrafficAggregate>();
  const destinations = new Map<string, TrafficAggregate>();

  for (const packet of packets) {
    const packetSize = Number.isFinite(packet.length)
      ? packet.length
      : packet.data.length;
    increment(sources, packet.src, packetSize);
    increment(destinations, packet.dest, packetSize);
  }

  return {
    sources: sortAggregates(sources),
    destinations: sortAggregates(destinations),
  };
};
