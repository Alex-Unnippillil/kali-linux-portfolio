'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { TrafficAggregate } from './trafficTypes';

interface TrafficChartProps {
  title: string;
  data: TrafficAggregate[];
  paused?: boolean;
  maxItems?: number;
  onAnimationFrame?: () => void;
}

const DEFAULT_MAX_ITEMS = 8;
const ANIMATION_INTERVAL_MS = 1000 / 30;

const formatBytes = (value: number) => {
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let current = value;
  while (current >= 1024 && idx < units.length - 1) {
    current /= 1024;
    idx += 1;
  }
  const rounded = current >= 10 || idx === 0 ? Math.round(current) : current.toFixed(1);
  return `${rounded} ${units[idx]}`;
};

const lerp = (current: number, target: number) => {
  const delta = target - current;
  if (Math.abs(delta) < 0.01) return target;
  return current + delta * 0.25;
};

const usePausableInterval = (
  callback: () => void,
  active: boolean,
  interval: number
) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) return undefined;

    const id = window.setInterval(() => {
      savedCallback.current();
    }, interval);

    return () => window.clearInterval(id);
  }, [active, interval]);
};

const TrafficChart: React.FC<TrafficChartProps> = ({
  title,
  data,
  paused = false,
  maxItems = DEFAULT_MAX_ITEMS,
  onAnimationFrame,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  const trimmedData = useMemo(
    () => data.slice(0, Math.max(0, maxItems)),
    [data, maxItems]
  );

  const targetRef = useRef(new Map<string, TrafficAggregate>());
  const [animatedData, setAnimatedData] = useState<TrafficAggregate[]>(() =>
    trimmedData.map((item) => ({ ...item, packets: 0, bytes: 0 }))
  );

  useEffect(() => {
    targetRef.current = new Map(trimmedData.map((item) => [item.address, item]));
    if (trimmedData.length === 0) {
      setAnimatedData([]);
      return;
    }
    setAnimatedData((prev) => {
      const existing = new Map(prev.map((item) => [item.address, item]));
      return trimmedData.map(
        (item) => existing.get(item.address) ?? { ...item, packets: 0, bytes: 0 }
      );
    });
  }, [trimmedData]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const stepAnimation = useCallback(() => {
    setAnimatedData((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((item) => {
        const target = targetRef.current.get(item.address);
        if (!target) {
          if (item.bytes === 0 && item.packets === 0) return item;
          changed = true;
          return { ...item, bytes: 0, packets: 0 };
        }
        const bytes = lerp(item.bytes, target.bytes);
        const packets = lerp(item.packets, target.packets);
        if (bytes !== item.bytes || packets !== item.packets) {
          changed = true;
        }
        return { address: item.address, bytes, packets };
      });
      return changed ? next : prev;
    });
    onAnimationFrame?.();
  }, [onAnimationFrame]);

  const shouldAnimate = !paused && isVisible && trimmedData.length > 0;
  usePausableInterval(stepAnimation, shouldAnimate, ANIMATION_INTERVAL_MS);

  const { maxBytes, maxPackets } = useMemo(() => {
    return animatedData.reduce(
      (acc, item) => ({
        maxBytes: Math.max(acc.maxBytes, item.bytes),
        maxPackets: Math.max(acc.maxPackets, item.packets),
      }),
      { maxBytes: 0, maxPackets: 0 }
    );
  }, [animatedData]);

  const bytesDenominator = maxBytes > 0 ? maxBytes : 1;
  const packetsDenominator = maxPackets > 0 ? maxPackets : 1;

  return (
    <div
      ref={containerRef}
      className="w-full rounded border border-gray-800 bg-gray-900 p-3 space-y-3"
      role="img"
      aria-label={`${title} traffic volume`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {(!isVisible || paused) && (
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            {paused ? 'Paused' : 'Hidden'}
          </span>
        )}
      </div>
      {trimmedData.length === 0 ? (
        <p className="text-xs text-gray-400">No packets captured for this view.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end space-x-4 text-[10px] font-semibold uppercase text-gray-400">
            <span className="flex items-center space-x-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" aria-hidden />
              <span>Bytes</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-green-500" aria-hidden />
              <span>Packets</span>
            </span>
          </div>
          {animatedData.map((item) => (
            <div key={item.address} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-200">
                <span className="truncate" title={item.address}>
                  {item.address || 'Unknown'}
                </span>
                <span className="text-gray-400">
                  {formatBytes(item.bytes)} • {Math.round(item.packets).toLocaleString()} pkts
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-gray-800">
                  <div
                    className="h-full rounded bg-blue-500"
                    style={{ width: `${(item.bytes / bytesDenominator) * 100}%` }}
                  />
                </div>
                <div className="h-2 w-full rounded bg-gray-800">
                  <div
                    className="h-full rounded bg-green-500"
                    style={{ width: `${(item.packets / packetsDenominator) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrafficChart;
