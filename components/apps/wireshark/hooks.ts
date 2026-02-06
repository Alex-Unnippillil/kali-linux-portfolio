'use client';

import { useEffect, useRef, useState } from 'react';

export interface PacketSummary {
  src?: string;
  dest?: string;
  data?: Uint8Array;
  length?: number;
  bytes?: number;
}

interface AggregatedStats {
  totalBytes: number;
  packetCount: number;
}

export interface TopTalkerDatum extends AggregatedStats {
  id: string;
}

export interface UseTopTalkersOptions {
  active?: boolean;
  interval?: number;
  chunkSize?: number;
  limit?: number;
}

const defaultOptions: Required<UseTopTalkersOptions> = {
  active: true,
  interval: 750,
  chunkSize: 50,
  limit: 5,
};

const packetSize = (pkt: PacketSummary): number => {
  if (pkt?.data && typeof pkt.data.byteLength === 'number') {
    return pkt.data.byteLength;
  }
  if (typeof pkt?.bytes === 'number') {
    return pkt.bytes;
  }
  if (typeof pkt?.length === 'number') {
    return pkt.length;
  }
  const maybeByteLength = (pkt as unknown as { byteLength?: number })?.byteLength;
  if (typeof maybeByteLength === 'number') {
    return maybeByteLength;
  }
  return 0;
};

const mapToSortedArray = (
  map: Map<string, AggregatedStats>,
  limit: number
): TopTalkerDatum[] =>
  Array.from(map.entries())
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .slice(0, limit);

export const useTopTalkers = (
  packets: PacketSummary[],
  options: UseTopTalkersOptions = {}
) => {
  const merged = { ...defaultOptions, ...options };
  const { active, interval, chunkSize, limit } = merged;
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));
  const safeLimit = Math.max(1, Math.floor(limit));

  const [sources, setSources] = useState<TopTalkerDatum[]>([]);
  const [destinations, setDestinations] = useState<TopTalkerDatum[]>([]);

  const processedRef = useRef(0);
  const aggregatesRef = useRef({
    sources: new Map<string, AggregatedStats>(),
    destinations: new Map<string, AggregatedStats>(),
  });
  const packetsRef = useRef<PacketSummary[]>(packets);

  useEffect(() => {
    packetsRef.current = packets ?? [];
    processedRef.current = 0;
    aggregatesRef.current = {
      sources: new Map(),
      destinations: new Map(),
    };
    setSources([]);
    setDestinations([]);
  }, [packets]);

  useEffect(() => {
    if (typeof window === 'undefined' || !active) {
      return undefined;
    }

    let cancelled = false;

    const processChunk = () => {
      if (cancelled) {
        return;
      }

      const currentPackets = packetsRef.current;
      if (!currentPackets.length) {
        return;
      }

      const startIndex = processedRef.current;
      const endIndex = Math.min(
        currentPackets.length,
        startIndex + safeChunkSize
      );

      if (startIndex >= endIndex) {
        return;
      }

      const aggregates = aggregatesRef.current;

      for (let i = startIndex; i < endIndex; i += 1) {
        const pkt = currentPackets[i];
        const size = packetSize(pkt);

        if (pkt?.src) {
          const srcStats =
            aggregates.sources.get(pkt.src) ||
            ({ totalBytes: 0, packetCount: 0 } as AggregatedStats);
          srcStats.totalBytes += size;
          srcStats.packetCount += 1;
          aggregates.sources.set(pkt.src, srcStats);
        }

        if (pkt?.dest) {
          const destStats =
            aggregates.destinations.get(pkt.dest) ||
            ({ totalBytes: 0, packetCount: 0 } as AggregatedStats);
          destStats.totalBytes += size;
          destStats.packetCount += 1;
          aggregates.destinations.set(pkt.dest, destStats);
        }
      }

      processedRef.current = endIndex;

      setSources(mapToSortedArray(aggregates.sources, safeLimit));
      setDestinations(mapToSortedArray(aggregates.destinations, safeLimit));
    };

    const tick = () => {
      processChunk();
    };

    tick();
    const timer = window.setInterval(tick, interval);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, interval, safeChunkSize, safeLimit, packets]);

  return { sources, destinations };
};

export type UseTopTalkersResult = ReturnType<typeof useTopTalkers>;
