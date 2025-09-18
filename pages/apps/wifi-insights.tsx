import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WindowMainScreen } from '../../components/base/window';
import ChannelChart, {
  WifiChannelSummary,
} from '../../components/apps/wifi/ChannelChart';
import SecurityBadgeList, {
  SecurityBadgeSummary,
} from '../../components/apps/wifi/SecurityBadgeList';
import NetworkList from '../../components/apps/wifi/NetworkList';
import type {
  WifiNetwork,
  WifiScanRequest,
  WifiScanResult,
  WifiScanWorkerMessage,
} from '../../types/wifi';
import { exportToClipboard, exportToFile, type ExportFormat } from '../../utils/export';

type ScanState = 'idle' | 'scanning' | 'ready' | 'error';

const normaliseDbm = (value: number) => Math.min(100, Math.max(0, 100 + value));

const toChannelSummaries = (networks: WifiNetwork[]): WifiChannelSummary[] => {
  const grouped = new Map<number, WifiChannelSummary>();

  networks.forEach((network) => {
    const current = grouped.get(network.channel);
    if (!current) {
      grouped.set(network.channel, {
        channel: network.channel,
        band: network.band,
        signalDbm: network.signal,
        noiseDbm: network.noise,
        normalizedSignal: normaliseDbm(network.signal),
        normalizedNoise: normaliseDbm(network.noise),
        utilization: network.utilization,
        networks: [network],
      });
      return;
    }
    current.networks.push(network);
    const count = current.networks.length;
    current.signalDbm = (current.signalDbm * (count - 1) + network.signal) / count;
    current.noiseDbm = (current.noiseDbm * (count - 1) + network.noise) / count;
    current.normalizedSignal = normaliseDbm(current.signalDbm);
    current.normalizedNoise = normaliseDbm(current.noiseDbm);
    current.utilization =
      (current.utilization * (count - 1) + network.utilization) / count;
  });

  return Array.from(grouped.values()).sort((a, b) => a.channel - b.channel);
};

const toSecurityBadges = (networks: WifiNetwork[]): SecurityBadgeSummary[] => {
  const counts = new Map<string, number>();
  networks.forEach((network) => {
    counts.set(network.security, (counts.get(network.security) ?? 0) + 1);
  });

  const variantFor = (label: string): SecurityBadgeSummary['variant'] => {
    if (label === 'Open') return 'open';
    if (label === 'WEP' || label === 'WPA') return 'legacy';
    return 'strong';
  };

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, variant: variantFor(label) }))
    .sort((a, b) => b.count - a.count);
};

const formatMode = (result?: WifiScanResult) => {
  if (!result) return null;
  switch (result.mode) {
    case 'offline':
      return 'Offline fixtures';
    case 'demo':
      return 'Demo data';
    default:
      return 'Simulated live data';
  }
};

const WifiInsightsApp: React.FC = () => {
  const [status, setStatus] = useState<ScanState>('idle');
  const [result, setResult] = useState<WifiScanResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const runScan = useCallback(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setStatus('error');
      return;
    }

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    try {
      const worker = new Worker(new URL('../../workers/wifiScan.ts', import.meta.url));
      workerRef.current = worker;
      setStatus('scanning');

      worker.onmessage = (event: MessageEvent<WifiScanWorkerMessage>) => {
        const message = event.data;
        if (message?.type === 'result') {
          setResult(message.result);
          setStatus('ready');
        }
      };

      worker.onerror = (error) => {
        console.error('Wi-Fi scan worker error', error);
        setStatus('error');
      };

      const request: WifiScanRequest = {
        type: 'scan',
        offline: typeof navigator !== 'undefined' ? !navigator.onLine : true,
        demoMode: true,
      };
      worker.postMessage(request);
    } catch (error) {
      console.error('Unable to start Wi-Fi scan', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    runScan();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [runScan]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const channelSummaries = useMemo(
    () => (result ? toChannelSummaries(result.networks) : []),
    [result],
  );

  const securityBadges = useMemo(
    () => (result ? toSecurityBadges(result.networks) : []),
    [result],
  );

  const handleClipboard = useCallback(
    async (format: ExportFormat) => {
      if (!result) return;
      const success = await exportToClipboard(result.networks, format);
      setFeedback(
        success
          ? `${format.toUpperCase()} copied to clipboard`
          : 'Clipboard export failed',
      );
    },
    [result],
  );

  const handleDownload = useCallback(
    (format: ExportFormat) => {
      if (!result) return;
      const success = exportToFile(
        result.networks,
        format,
        `wifi-insights-${format === 'json' ? 'scan.json' : 'scan.csv'}`,
      );
      setFeedback(
        success
          ? `${format.toUpperCase()} download started`
          : 'Download failed',
      );
    },
    [result],
  );

  const modeLabel = formatMode(result ?? undefined);

  return (
    <WindowMainScreen
      screen={() => (
        <div className="flex h-full flex-col gap-4 bg-ub-cool-grey/80 p-4 text-white">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Wi-Fi Insights</h1>
              <p className="text-sm text-ubt-grey">
                {status === 'scanning' && 'Scanning nearby channels…'}
                {status === 'ready' && result && (
                  <>
                    Last run {new Date(result.generatedAt).toLocaleTimeString()}
                    {modeLabel ? ` • ${modeLabel}` : ''}
                  </>
                )}
                {status === 'error' &&
                  'Simulation unavailable. Check offline/demo mode and retry.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runScan}
                className="rounded-md bg-ubt-blue px-3 py-2 text-sm font-semibold text-black shadow focus:outline-none focus:ring"
              >
                {status === 'scanning' ? 'Scanning…' : 'Rescan networks'}
              </button>
              <div className="flex flex-wrap gap-2">
                {(['json', 'csv'] as ExportFormat[]).map((format) => (
                  <React.Fragment key={`copy-${format}`}>
                    <button
                      type="button"
                      disabled={!result}
                      onClick={() => handleClipboard(format)}
                      className="rounded-md border border-ubt-cool-grey px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy {format.toUpperCase()}
                    </button>
                    <button
                      type="button"
                      disabled={!result}
                      onClick={() => handleDownload(format)}
                      className="rounded-md border border-ubt-cool-grey px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save {format.toUpperCase()}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </header>

          {feedback && (
            <p className="text-xs text-emerald-300" role="status">
              {feedback}
            </p>
          )}

          {channelSummaries.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {channelSummaries.map((summary) => (
                <ChannelChart key={summary.channel} summary={summary} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-ubt-cool-grey/70 p-6 text-center text-sm text-ubt-grey">
              {status === 'scanning'
                ? 'Collecting channel statistics…'
                : 'No wireless networks detected in the latest scan.'}
            </div>
          )}

          {securityBadges.length ? (
            <SecurityBadgeList badges={securityBadges} />
          ) : (
            <p className="text-sm text-ubt-grey">Security breakdown will appear after a successful scan.</p>
          )}

          {result && result.networks.length ? (
            <NetworkList networks={result.networks} />
          ) : null}
        </div>
      )}
    />
  );
};

const WifiInsightsPage = () => <WifiInsightsApp />;

export { WifiInsightsApp };
export default WifiInsightsPage;
