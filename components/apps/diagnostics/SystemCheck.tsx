"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { copyToClipboard } from '@/utils/clipboard';

export interface StorageEstimate {
  usage?: number;
  quota?: number;
}

export interface SystemCheckResult {
  os: string;
  browser: string;
  gpu: string;
  storage: StorageEstimate;
  timeSkewMs: number | null;
  timezone?: string;
  timestamp: string;
}

const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) {
    return 'Unknown';
  }
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const precision = exponent === 0 ? 0 : value < 10 ? 2 : 1;
  const normalized = Number(value.toFixed(precision));
  return `${normalized} ${units[exponent]}`;
};

const describeStorage = (storage: StorageEstimate): string => {
  const { usage, quota } = storage;
  if (usage === undefined && quota === undefined) {
    return 'Unavailable';
  }
  const usageText = formatBytes(usage);
  if (quota === undefined) {
    return usageText;
  }
  const quotaText = formatBytes(quota);
  const percentage = usage !== undefined && quota ? ` (${((usage / quota) * 100).toFixed(1)}%)` : '';
  return `${usageText} of ${quotaText}${percentage}`;
};

const describeTimeSkew = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return 'Unavailable';
  }
  return `${value} ms (system vs monotonic clock)`;
};

const detectOS = (): string => {
  if (typeof navigator === 'undefined') {
    return 'Unknown';
  }
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
  const ua = navigator.userAgent || '';
  const normalized = `${platform} ${ua}`.toLowerCase();

  if (normalized.includes('win')) return 'Windows';
  if (normalized.includes('mac')) return 'macOS';
  if (normalized.includes('linux')) return 'Linux';
  if (normalized.includes('android')) return 'Android';
  if (normalized.includes('iphone') || normalized.includes('ipad') || normalized.includes('ios')) {
    return 'iOS';
  }
  return platform || 'Unknown';
};

const detectBrowser = (): string => {
  if (typeof navigator === 'undefined') {
    return 'Unknown';
  }
  const ua = navigator.userAgent;
  if (!ua) return 'Unknown';

  const match = (pattern: RegExp) => ua.match(pattern)?.[1];

  if (/edg\//i.test(ua)) {
    const version = match(/Edg\/([\d.]+)/i);
    return version ? `Microsoft Edge ${version}` : 'Microsoft Edge';
  }
  if (/chrome|crios|crmo/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua)) {
    const version = match(/Chrome\/([\d.]+)/i);
    return version ? `Chrome ${version}` : 'Chrome';
  }
  if (/firefox|fxios/i.test(ua)) {
    const version = match(/Firefox\/([\d.]+)/i);
    return version ? `Firefox ${version}` : 'Firefox';
  }
  if (/safari/i.test(ua) && !/chrome|crios|crmo|android/i.test(ua)) {
    const version = match(/Version\/([\d.]+)/i);
    return version ? `Safari ${version}` : 'Safari';
  }
  if (/opr\//i.test(ua)) {
    const version = match(/OPR\/([\d.]+)/i);
    return version ? `Opera ${version}` : 'Opera';
  }
  if (/msie|trident/i.test(ua)) {
    const version = match(/(?:MSIE |rv:)([\d.]+)/i);
    return version ? `Internet Explorer ${version}` : 'Internet Explorer';
  }
  return 'Unknown';
};

const detectGPU = (): string => {
  if (typeof document === 'undefined') {
    return 'Unavailable';
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return 'Unavailable';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const parts = [vendor, renderer].filter((value): value is string => typeof value === 'string' && value.trim().length);
      if (parts.length) {
        return parts.join(' · ');
      }
    }
    const renderer = gl.getParameter(gl.RENDERER);
    if (typeof renderer === 'string' && renderer.trim().length) {
      return renderer;
    }
    return 'Unavailable';
  } catch {
    return 'Unavailable';
  }
};

const estimateStorage = async (): Promise<StorageEstimate> => {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {};
  }
  try {
    const { quota, usage } = await navigator.storage.estimate();
    return { quota: quota ?? undefined, usage: usage ?? undefined };
  } catch {
    return {};
  }
};

const computeTimeSkew = (): number | null => {
  if (typeof performance === 'undefined' || typeof Date === 'undefined') {
    return null;
  }
  const now = Date.now();
  const base = typeof performance.timeOrigin === 'number' ? performance.timeOrigin : performance.timing?.navigationStart;
  if (typeof base !== 'number' || Number.isNaN(base)) {
    return null;
  }
  const monotonic = (typeof performance.now === 'function' ? performance.now() : 0) + base;
  return Math.round(now - monotonic);
};

const createInitialState = (): SystemCheckResult => ({
  os: 'Unknown',
  browser: 'Unknown',
  gpu: 'Unavailable',
  storage: {},
  timeSkewMs: null,
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
  timestamp: new Date().toISOString(),
});

export const formatSystemReport = (data: SystemCheckResult): string => {
  const storageLine = describeStorage(data.storage);
  const skewLine = describeTimeSkew(data.timeSkewMs);
  const lines = [
    '# System Check Report',
    `- **Generated:** ${data.timestamp}`,
    `- **OS:** ${data.os}`,
    `- **Browser:** ${data.browser}`,
    `- **GPU:** ${data.gpu}`,
    `- **Storage:** ${storageLine}`,
    `- **Time skew:** ${skewLine}`,
  ];
  if (data.timezone) {
    lines.push(`- **Timezone:** ${data.timezone}`);
  }
  return lines.join('\n');
};

const SystemCheck: React.FC = () => {
  const [info, setInfo] = useState<SystemCheckResult>(() => createInitialState());
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const collect = async () => {
      const storage = await estimateStorage();
      const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
      const next: SystemCheckResult = {
        os: detectOS(),
        browser: detectBrowser(),
        gpu: detectGPU(),
        storage,
        timeSkewMs: computeTimeSkew(),
        timezone,
        timestamp: new Date().toISOString(),
      };
      if (!cancelled) {
        setInfo(next);
        setLoading(false);
      }
    };

    collect();

    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(() => formatSystemReport(info), [info]);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(report);
    setCopyMessage(success ? 'Report copied to clipboard.' : 'Copy failed. Select the report above and copy manually.');
  }, [report]);

  useEffect(() => {
    if (!copyMessage) return;
    const timeout = window.setTimeout(() => setCopyMessage(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  return (
    <section
      className="flex h-full flex-col gap-4 bg-ub-cool-grey p-4 text-white focus:outline-none"
      aria-labelledby="system-check-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="system-check-heading" className="text-lg font-semibold">
          System Check
        </h1>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-ub-dracula px-3 py-1 text-sm font-medium hover:bg-ub-dracula-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Copy report
        </button>
      </header>
      <div className="flex-1 overflow-auto rounded border border-white/10 bg-black/20 p-3">
        {loading ? (
          <p className="text-sm text-white/80">Collecting system information…</p>
        ) : (
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-white/90">Operating system</dt>
              <dd className="text-white/80">{info.os}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white/90">Browser</dt>
              <dd className="text-white/80">{info.browser}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white/90">GPU</dt>
              <dd className="text-white/80">{info.gpu}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white/90">Storage quota</dt>
              <dd className="text-white/80">{describeStorage(info.storage)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white/90">Time skew</dt>
              <dd className="text-white/80">{describeTimeSkew(info.timeSkewMs)}</dd>
            </div>
            {info.timezone ? (
              <div>
                <dt className="font-semibold text-white/90">Timezone</dt>
                <dd className="text-white/80">{info.timezone}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-semibold text-white/90">Generated</dt>
              <dd className="text-white/80">{new Date(info.timestamp).toLocaleString()}</dd>
            </div>
          </dl>
        )}
      </div>
      <div className="rounded border border-white/10 bg-black/40 p-3">
        <h2 className="mb-2 text-sm font-semibold text-white/90">Markdown report</h2>
        <pre
          className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-black/60 p-2 text-xs text-white/80"
          tabIndex={0}
        >
          {report}
        </pre>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-[1.5rem] text-sm text-white/80"
      >
        {copyMessage}
      </p>
    </section>
  );
};

export const displaySystemCheck = () => <SystemCheck />;

export default SystemCheck;

