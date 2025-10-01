'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { refreshQuota, subscribeToQuota, type StorageQuotaSnapshot } from '../../utils/quota';
import { clearScans } from '../../utils/qrStorage';
import { clearReplays as clearKeyvalReplays } from '../../utils/storage';
import { clearReplays as clearIndexedDbReplays } from '../../utils/idb';

interface PurgeAction {
  id: string;
  label: string;
  description: string;
  perform: () => Promise<void>;
}

interface ActionState {
  pending: boolean;
  error: string | null;
  lastSuccessAt: number | null;
}

const PURGE_ACTIONS: PurgeAction[] = [
  {
    id: 'qr-history',
    label: 'Clear QR history',
    description: 'Remove saved QR scan history from local storage and OPFS.',
    perform: async () => {
      await clearScans();
    },
  },
  {
    id: 'game-replays',
    label: 'Delete game replays',
    description: 'Free cached arcade replays stored for offline play.',
    perform: async () => {
      await Promise.allSettled([clearKeyvalReplays(), clearIndexedDbReplays()]);
    },
  },
];

const WARNING_THRESHOLD = 0.8;

const formatBytes = (value: number): string => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = size >= 100 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const computePercent = (usage: number, quota: number): number => {
  if (!quota) return 0;
  return Math.min(100, Math.round((usage / quota) * 100));
};

const StorageMeter: React.FC = () => {
  const [snapshot, setSnapshot] = useState<StorageQuotaSnapshot | null>(null);
  const [actions, setActions] = useState<Record<string, ActionState>>({});

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToQuota((data) => {
      if (!active) return;
      setSnapshot(data);
    });

    refreshQuota()
      .then((initial) => {
        if (active) setSnapshot(initial);
      })
      .catch(() => {
        if (active) setSnapshot(null);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const percentUsed = useMemo(() => computePercent(snapshot?.usage ?? 0, snapshot?.quota ?? 0), [
    snapshot,
  ]);

  const warning = snapshot?.supported && percentUsed >= WARNING_THRESHOLD * 100;

  const handleAction = async (action: PurgeAction) => {
    setActions((prev) => ({
      ...prev,
      [action.id]: {
        pending: true,
        error: null,
        lastSuccessAt: prev[action.id]?.lastSuccessAt ?? null,
      },
    }));

    try {
      await action.perform();
      await refreshQuota();
      setActions((prev) => ({
        ...prev,
        [action.id]: {
          pending: false,
          error: null,
          lastSuccessAt: Date.now(),
        },
      }));
    } catch (error: any) {
      setActions((prev) => ({
        ...prev,
        [action.id]: {
          pending: false,
          error: error?.message ?? 'Unable to purge data. Try again.',
          lastSuccessAt: prev[action.id]?.lastSuccessAt ?? null,
        },
      }));
    }
  };

  if (!snapshot?.supported) {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-ubt-grey"
      >
        <h2 className="text-base font-semibold text-white">Storage usage</h2>
        <p className="mt-2 text-ubt-grey">
          Storage statistics are unavailable in this browser. Try using a modern browser to monitor
          local usage.
        </p>
      </section>
    );
  }

  const meterColor = warning ? 'bg-amber-400' : 'bg-emerald-500';
  const available = snapshot.available;

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-ubt-grey"
    >
      <h2 className="text-base font-semibold text-white">Storage usage</h2>
      <p className="mt-2 text-ubt-grey">
        {percentUsed}% used · {formatBytes(snapshot.usage)} of {formatBytes(snapshot.quota)} stored locally
      </p>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={snapshot.quota || 1}
        aria-valuenow={snapshot.usage}
        aria-valuetext={`${percentUsed}% of quota used`}
        className="mt-3 h-2 w-full overflow-hidden rounded bg-white/10"
      >
        <div className={`h-full ${meterColor}`} style={{ width: `${percentUsed}%` }} />
      </div>
      {warning ? (
        <p className="mt-3 rounded border border-amber-400/40 bg-amber-400/10 p-3 text-amber-200">
          Storage is {percentUsed}% full. Consider purging cached data below to free space.
        </p>
      ) : (
        <p className="mt-3 rounded border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-100">
          {available > 0
            ? `${formatBytes(available)} available for local apps and offline data.`
            : 'No free space remains. Purge cached data to continue saving progress.'}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded border border-white/10 bg-white/5 p-3">
          <dt className="text-xs uppercase tracking-wide text-white/70">IndexedDB</dt>
          <dd className="text-base font-semibold text-white">{formatBytes(snapshot.indexedDBUsage)}</dd>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-3">
          <dt className="text-xs uppercase tracking-wide text-white/70">OPFS</dt>
          <dd className="text-base font-semibold text-white">{formatBytes(snapshot.opfsUsage)}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Purge suggestions</h3>
        {PURGE_ACTIONS.map((action) => {
          const state = actions[action.id];
          return (
            <div
              key={action.id}
              className="rounded border border-white/10 bg-white/5 p-3 text-sm text-ubt-grey"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{action.label}</p>
                  <p className="text-xs text-ubt-grey/80">{action.description}</p>
                  {state?.error && (
                    <p className="mt-1 text-xs text-amber-200" role="alert">
                      {state.error}
                    </p>
                  )}
                  {state?.lastSuccessAt && !state.error && (
                    <p className="mt-1 text-xs text-emerald-200">
                      Cleared {new Date(state.lastSuccessAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleAction(action)}
                  disabled={state?.pending}
                  className="inline-flex items-center justify-center rounded bg-ub-orange px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-ub-orange/60"
                >
                  {state?.pending ? 'Clearing…' : 'Clear now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StorageMeter;
