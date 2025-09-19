'use client';

import React, { useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import {
  captureResourceSnapshot,
  serializeResourceSnapshot,
} from '../../../lib/resourceSnapshot';
import { downloadJson, exportMetrics } from '../export';
import RequestChart from './RequestChart';

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<FetchEntry[]>(HISTORY_KEY, []);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      setHistory((h) => [...h, e.detail]);
    });
    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [setHistory]);

  const handleSnapshot = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setSnapshotMessage(null);
    try {
      const snapshot = await captureResourceSnapshot({
        network: { active, history },
      });
      const serialized = serializeResourceSnapshot(snapshot);
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');
      downloadJson(serialized, `diagnostics-snapshot-${timestamp}.json`);
      let message = 'Snapshot downloaded.';
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(serialized);
          message = 'Snapshot copied to clipboard and downloaded.';
        } catch {
          message = 'Snapshot downloaded. Clipboard copy failed.';
        }
      }
      setSnapshotMessage(message);
    } catch (err) {
      console.error('Failed to capture diagnostics snapshot', err);
      setSnapshotMessage('Failed to capture diagnostics snapshot.');
    } finally {
      setIsCapturing(false);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => setSnapshotMessage(null), 4000);
      }
    }
  };

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
      <h2 className="font-bold mb-1">Active Fetches</h2>
      <ul className="mb-2 divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
        {active.length === 0 && <li className="p-1 text-gray-400">None</li>}
        {active.map((f) => (
          <li key={f.id} className="p-1">
            <div className="truncate">
              {f.method} {f.url}
            </div>
            <div className="text-gray-400">
              {((typeof performance !== 'undefined' ? performance.now() : Date.now()) - f.startTime).toFixed(0)}ms elapsed
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center mb-1">
        <h2 className="font-bold">History</h2>
        <button
          onClick={() => exportMetrics(history)}
          className="ml-auto px-2 py-1 rounded bg-[var(--kali-panel)]"
        >
          Export
        </button>
        <button
          onClick={handleSnapshot}
          disabled={isCapturing}
          className="ml-2 px-2 py-1 rounded bg-[var(--kali-panel)] disabled:opacity-50"
        >
          {isCapturing ? 'Capturing…' : 'Snapshot'}
        </button>
      </div>
      {snapshotMessage && (
        <div
          aria-live="polite"
          className="mb-2 text-[var(--kali-accent,#a8e0ff)]"
        >
          {snapshotMessage}
        </div>
      )}
      <ul className="divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
        {history.length === 0 && <li className="p-1 text-gray-400">No requests</li>}
        {history.map((f) => (
          <li key={f.id} className="p-1">
            <div className="truncate">
              {f.method} {f.url}
              {f.fromServiceWorkerCache && (
                <span className="ml-2 text-green-400">(SW cache)</span>
              )}
            </div>
            <div className="text-gray-400">
              {f.duration ? `${f.duration.toFixed(0)}ms` : ''} · req {formatBytes(f.requestSize)} · res {formatBytes(f.responseSize)}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-center">
        <RequestChart
          data={history.map((h) => h.duration ?? 0)}
          label="Request duration (ms)"
        />
      </div>
    </div>
  );
}

