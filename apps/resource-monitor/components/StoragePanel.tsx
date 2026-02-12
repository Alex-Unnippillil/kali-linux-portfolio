'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface StorageEstimateLike {
  usage: number;
  quota: number;
  usageDetails?: Record<string, number> | undefined;
}

type BreakdownMeta = {
  label: string;
  tips: string[];
};

const BYTES_IN_GIB = 1024 ** 3;

const FALLBACK_ESTIMATE: StorageEstimateLike = {
  usage: 1.3 * BYTES_IN_GIB,
  quota: 2 * BYTES_IN_GIB,
  usageDetails: {
    caches: 0.35 * BYTES_IN_GIB,
    indexedDB: 0.55 * BYTES_IN_GIB,
    serviceWorkerRegistrations: 0.18 * BYTES_IN_GIB,
  },
};

const SECTION_META: Record<string, BreakdownMeta> & {
  default: BreakdownMeta;
} = {
  caches: {
    label: 'Cache Storage',
    tips: [
      'Clear cached assets in Settings → Privacy to flush service caches.',
      'Remove downloaded media from apps like YouTube or Spotify.',
    ],
  },
  indexedDB: {
    label: 'IndexedDB Databases',
    tips: [
      'Archive or export large lab capture files from the desktop apps.',
      'Delete unused project gallery entries you no longer need.',
    ],
  },
  serviceWorkerRegistrations: {
    label: 'Service Workers',
    tips: [
      'Reload the desktop with Ctrl+Shift+R to replace old service workers.',
      'Uninstall simulations you are not using from the Applications menu.',
    ],
  },
  other: {
    label: 'Other Application Data',
    tips: [
      'Review app preferences for logs or exports that can be trimmed.',
      'Use the Trash app to purge stale or deleted files.',
    ],
  },
  default: {
    label: 'App Data',
    tips: [
      'Open the Trash app to permanently delete files marked for removal.',
      'Reset offline caches from Settings → Privacy when storage runs low.',
    ],
  },
};

const GENERAL_TIPS = [
  'Empty the Trash can to reclaim space from deleted files.',
  'Clear offline caches from Settings → Privacy.',
  'Export large capture logs and remove the local copies.',
];

const clampPct = (value: number) => Math.max(0, Math.min(value, 1));

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const precision = value >= 100 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

export default function StoragePanel() {
  const [estimate, setEstimate] = useState<StorageEstimateLike>(FALLBACK_ESTIMATE);
  const [hasLiveData, setHasLiveData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadEstimate = async () => {
      if (!('storage' in navigator) || !navigator.storage?.estimate) return;
      try {
        const data = await navigator.storage.estimate();
        if (cancelled || !data) return;
        setEstimate({
          usage: data.usage ?? FALLBACK_ESTIMATE.usage,
          quota: data.quota ?? FALLBACK_ESTIMATE.quota,
          usageDetails:
            data.usageDetails && Object.keys(data.usageDetails).length > 0
              ? data.usageDetails
              : FALLBACK_ESTIMATE.usageDetails,
        });
        setHasLiveData(true);
      } catch {
        // fall back to simulated data
      }
    };

    void loadEstimate();

    return () => {
      cancelled = true;
    };
  }, []);

  const quota = estimate.quota > 0 ? estimate.quota : FALLBACK_ESTIMATE.quota;
  const usage = Math.max(0, estimate.usage);
  const pct = quota > 0 ? usage / quota : 0;
  const clampedPct = clampPct(pct);
  const warning = pct > 0.8;
  const remaining = Math.max(quota - usage, 0);

  const breakdown = useMemo(() => {
    const details = estimate.usageDetails ?? FALLBACK_ESTIMATE.usageDetails ?? {};
    const entries = Object.entries(details).map(([key, value]) => {
      const meta = SECTION_META[key] ?? SECTION_META.default;
      const sectionPct = quota > 0 ? value / quota : 0;
      return {
        id: key,
        label: meta.label,
        usage: value,
        pct: sectionPct,
        warning: sectionPct > 0.8,
        tips: meta.tips,
      };
    });

    if (entries.length === 0) {
      const meta = SECTION_META.default;
      entries.push({
        id: 'default',
        label: meta.label,
        usage,
        pct,
        warning,
        tips: meta.tips,
      });
    }

    return entries.sort((a, b) => b.usage - a.usage);
  }, [estimate.usageDetails, quota, usage, pct, warning]);

  const percentLabel = quota > 0 ? `${Math.min(pct * 100, 999).toFixed(1)}%` : '—';
  const barClass = warning ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
      <div className="rounded border border-gray-700 bg-[var(--kali-panel)] p-3 shadow-inner">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-sm font-semibold">Storage Utilization</h2>
            <p className="text-[11px] text-ubt-grey">
              {hasLiveData
                ? 'Live metrics from navigator.storage.estimate().' 
                : 'Simulated data shown while the Storage API is unavailable.'}
            </p>
          </div>
          <span className={`ml-auto whitespace-nowrap text-sm font-semibold ${warning ? 'text-amber-300' : 'text-emerald-300'}`}>
            {percentLabel}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-ubt-grey">
            <span>Used {formatBytes(usage)}</span>
            <span>Total {formatBytes(quota)}</span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-gray-800" data-testid="storage-progress">
            <div
              data-testid="storage-progress-fill"
              className={`h-full rounded ${barClass}`}
              style={{ width: `${clampedPct * 100}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-ubt-grey">{formatBytes(remaining)} free</div>
        </div>
        {warning && (
          <div className="mt-3 rounded border border-amber-500 bg-amber-500/10 p-3 text-[11px] text-amber-200">
            <div className="text-xs font-semibold uppercase tracking-wide">
              Storage cleanup recommended
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {GENERAL_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Breakdown</h3>
          <ul className="mt-2 space-y-3">
            {breakdown.map((section) => {
              const sectionPct = clampPct(section.pct);
              const sectionBarClass = section.warning ? 'bg-amber-400' : 'bg-sky-500';
              return (
                <li key={section.id} className="rounded border border-gray-700 bg-[var(--kali-bg)] p-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-white">{section.label}</span>
                    <span className="text-ubt-grey">{formatBytes(section.usage)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-gray-800" data-testid={`storage-breakdown-${section.id}`}>
                    <div
                      data-testid={`storage-breakdown-${section.id}-fill`}
                      className={`h-full rounded ${sectionBarClass}`}
                      style={{ width: `${sectionPct * 100}%` }}
                    />
                  </div>
                  {section.warning && (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-amber-200">
                      {section.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
