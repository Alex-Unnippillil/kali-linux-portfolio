'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StatsChart from '../../StatsChart';

export interface NetworkSample {
  seq: number;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLoss: number;
}

interface BurstSummary {
  id: string;
  startedAt: number;
  durationMs: number;
  timestamp: string;
  sampleCount: number;
  seqStart: number;
  seqEnd: number;
  downloadAvg: number;
  uploadAvg: number;
  latencyAvg: number;
  jitterAvg: number;
  packetLossAvg: number;
  error?: string;
}

export interface NetworkTestProps {
  endpoint?: string;
  intervalMs?: number;
  burstSize?: number;
  isRunning: boolean;
  resetSignal?: number;
  onAutoPauseChange?: (autoPaused: boolean) => void;
}

const MAX_HISTORY = 8;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const toNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normaliseSample = (payload: unknown, fallbackSeq: number): NetworkSample => {
  if (payload && typeof payload === 'object') {
    const maybeSamples = (payload as { samples?: unknown }).samples;
    if (Array.isArray(maybeSamples) && maybeSamples.length > 0) {
      return normaliseSample(maybeSamples[0], fallbackSeq);
    }
    const sample = payload as Partial<NetworkSample>;
    return {
      seq: toNumber(sample.seq, fallbackSeq),
      timestamp:
        typeof sample.timestamp === 'string'
          ? sample.timestamp
          : new Date(Date.now()).toISOString(),
      downloadMbps: toNumber(sample.downloadMbps),
      uploadMbps: toNumber(sample.uploadMbps),
      latencyMs: toNumber(sample.latencyMs),
      jitterMs: toNumber(sample.jitterMs),
      packetLoss: toNumber(sample.packetLoss),
    };
  }
  return {
    seq: fallbackSeq,
    timestamp: new Date(Date.now()).toISOString(),
    downloadMbps: 0,
    uploadMbps: 0,
    latencyMs: 0,
    jitterMs: 0,
    packetLoss: 0,
  };
};

const summariseBurst = (
  samples: NetworkSample[],
  startedAt: number,
  endedAt: number,
  counter: number,
): BurstSummary => {
  const sampleCount = samples.length;
  const seqStart = sampleCount ? Math.min(...samples.map((s) => s.seq)) : 0;
  const seqEnd = sampleCount ? Math.max(...samples.map((s) => s.seq)) : seqStart;
  const timestamp =
    sampleCount > 0 ? samples[sampleCount - 1].timestamp : new Date().toISOString();

  const sums = samples.reduce(
    (acc, sample) => {
      acc.download += sample.downloadMbps;
      acc.upload += sample.uploadMbps;
      acc.latency += sample.latencyMs;
      acc.jitter += sample.jitterMs;
      acc.packetLoss += sample.packetLoss;
      return acc;
    },
    { download: 0, upload: 0, latency: 0, jitter: 0, packetLoss: 0 },
  );

  const average = (value: number) => (sampleCount > 0 ? value / sampleCount : 0);

  return {
    id: `${counter}-${seqStart}-${seqEnd}-${startedAt.toFixed(2)}`,
    startedAt,
    durationMs: Math.max(0, endedAt - startedAt),
    timestamp,
    sampleCount,
    seqStart,
    seqEnd,
    downloadAvg: average(sums.download),
    uploadAvg: average(sums.upload),
    latencyAvg: average(sums.latency),
    jitterAvg: average(sums.jitter),
    packetLossAvg: average(sums.packetLoss),
  };
};

const NetworkTest: React.FC<NetworkTestProps> = ({
  endpoint = '/api/network-sample',
  intervalMs = 4000,
  burstSize = 3,
  isRunning,
  resetSignal = 0,
  onAutoPauseChange,
}) => {
  const [bursts, setBursts] = useState<BurstSummary[]>([]);
  const [autoPaused, setAutoPaused] = useState<boolean>(
    typeof document !== 'undefined' ? Boolean(document.hidden) : false,
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [isSampling, setIsSampling] = useState(false);

  const sequenceRef = useRef(0);
  const burstCounterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenRef = useRef<boolean>(typeof document !== 'undefined' ? !!document.hidden : false);
  const manualRunRef = useRef<boolean>(isRunning);
  const samplingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pushBurst = useCallback((summary: BurstSummary) => {
    setBursts((prev) => {
      const next = [...prev, summary];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  }, []);

  const runBurst = useCallback(async () => {
    if (!manualRunRef.current || hiddenRef.current || samplingRef.current) return;
    samplingRef.current = true;
    setIsSampling(true);

    const burstStart = now();
    const startSeq = sequenceRef.current;
    const requests = Array.from({ length: burstSize }, (_, idx) => {
      const seq = startSeq + idx;
      return fetch(`${endpoint}?seq=${seq}`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          return response.json();
        })
        .then((payload) => normaliseSample(payload, seq));
    });

    sequenceRef.current += burstSize;

    try {
      const results = await Promise.all(requests);
      const burstEnd = now();
      const counter = burstCounterRef.current++;
      pushBurst(summariseBurst(results, burstStart, burstEnd, counter));
      setLastError(null);
    } catch (error) {
      const burstEnd = now();
      const counter = burstCounterRef.current++;
      pushBurst({
        id: `${counter}-error-${startSeq}-${burstStart.toFixed(2)}`,
        startedAt: burstStart,
        durationMs: Math.max(0, burstEnd - burstStart),
        timestamp: new Date().toISOString(),
        sampleCount: 0,
        seqStart: startSeq,
        seqEnd: startSeq + burstSize - 1,
        downloadAvg: 0,
        uploadAvg: 0,
        latencyAvg: 0,
        jitterAvg: 0,
        packetLossAvg: 0,
        error: (error as Error).message || 'Request failed',
      });
      setLastError((error as Error).message || 'Request failed');
    } finally {
      samplingRef.current = false;
      setIsSampling(false);
    }

    if (!manualRunRef.current || hiddenRef.current) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      runBurst();
    }, intervalMs);
  }, [burstSize, clearTimer, endpoint, intervalMs, pushBurst]);

  useEffect(() => {
    manualRunRef.current = isRunning;
    if (!isRunning) {
      clearTimer();
      return;
    }
    if (!hiddenRef.current) {
      runBurst();
    }
  }, [clearTimer, isRunning, runBurst]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      const hidden = Boolean(document.hidden);
      hiddenRef.current = hidden;
      setAutoPaused(hidden);
      onAutoPauseChange?.(hidden);
      if (hidden) {
        clearTimer();
      } else if (manualRunRef.current) {
        runBurst();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [clearTimer, onAutoPauseChange, runBurst]);

  useEffect(() => {
    clearTimer();
    samplingRef.current = false;
    setIsSampling(false);
    sequenceRef.current = 0;
    burstCounterRef.current = 0;
    setBursts([]);
    setLastError(null);
    if (manualRunRef.current && !hiddenRef.current) {
      runBurst();
    }
  }, [clearTimer, resetSignal, runBurst]);

  useEffect(() => () => {
    manualRunRef.current = false;
    clearTimer();
  }, [clearTimer]);

  const latestSuccessful = useMemo(() => {
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      const burst = bursts[i];
      if (!burst.error && burst.sampleCount > 0) return burst;
    }
    return null;
  }, [bursts]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white" data-testid="network-test">
      <section className="rounded border border-ubt-grey/60 bg-black/40 p-4 shadow-inner">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Network burst sampler</h2>
          <span
            className={`text-xs uppercase tracking-wide ${
              isSampling ? 'text-emerald-300' : 'text-ubt-grey'
            }`}
          >
            {isSampling ? 'Sampling…' : 'Idle'}
          </span>
        </div>
        <p className="mt-2 text-sm text-ubt-grey">
          Fetching {burstSize} samples from{' '}
          <code className="text-xs text-emerald-200">{endpoint}</code> every{' '}
          {(intervalMs / 1000).toFixed(1)} seconds to emulate traffic bursts.
        </p>
        {!isRunning && (
          <p className="mt-2 text-xs text-ubt-grey" role="status">
            Sampling paused via controls.
          </p>
        )}
        {autoPaused && (
          <p className="mt-2 text-xs text-yellow-300" role="status">
            Hidden tab detected — sampling suspended until focus returns.
          </p>
        )}
        {lastError && (
          <p className="mt-2 text-xs text-red-300" role="alert">
            Last error: {lastError}
          </p>
        )}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-ubt-grey/60 bg-black/40 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
            Throughput vs latency
          </h3>
          <div className="mt-2 h-24 w-full">
            {latestSuccessful ? (
              <StatsChart
                count={Math.max(latestSuccessful.downloadAvg, 0)}
                time={Math.max(latestSuccessful.latencyAvg, 0)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ubt-grey">
                Waiting for successful samples…
              </div>
            )}
          </div>
          {latestSuccessful && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-ubt-grey">
              <div>
                <dt className="font-medium text-white">Download</dt>
                <dd>{latestSuccessful.downloadAvg.toFixed(1)} Mbps</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Upload</dt>
                <dd>{latestSuccessful.uploadAvg.toFixed(1)} Mbps</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Latency</dt>
                <dd>{latestSuccessful.latencyAvg.toFixed(1)} ms</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Jitter</dt>
                <dd>{latestSuccessful.jitterAvg.toFixed(2)} ms</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Packet loss</dt>
                <dd>{latestSuccessful.packetLossAvg.toFixed(3)}%</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Samples</dt>
                <dd>{latestSuccessful.sampleCount}</dd>
              </div>
            </dl>
          )}
        </div>
        <div className="rounded border border-ubt-grey/60 bg-black/40 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
            Recent bursts
          </h3>
          <ul className="mt-3 space-y-2 text-xs">
            {bursts.length === 0 ? (
              <li className="text-ubt-grey">No bursts sampled yet.</li>
            ) : (
              bursts
                .slice()
                .reverse()
                .map((burst) => (
                  <li
                    key={burst.id}
                    className="rounded border border-ubt-grey/40 bg-black/50 p-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-ubt-grey">
                      <span>
                        Seq {burst.seqStart}–{burst.seqEnd}
                      </span>
                      <span>{new Date(burst.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                      <span>↓ {burst.downloadAvg.toFixed(1)} Mbps</span>
                      <span>↑ {burst.uploadAvg.toFixed(1)} Mbps</span>
                      <span>Latency {burst.latencyAvg.toFixed(1)} ms</span>
                      <span>Jitter {burst.jitterAvg.toFixed(2)} ms</span>
                    </div>
                    <div className="mt-1 text-ubt-grey">
                      Duration {burst.durationMs.toFixed(0)} ms · Packet loss{' '}
                      {burst.packetLossAvg.toFixed(3)}%
                    </div>
                    {burst.error && (
                      <p className="mt-1 text-red-300">Error: {burst.error}</p>
                    )}
                  </li>
                ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default NetworkTest;
