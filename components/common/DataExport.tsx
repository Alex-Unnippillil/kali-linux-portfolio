"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyDataBundle,
  createDataBundle,
  estimateBundleSize,
  formatBundleSize,
  parseDataBundle,
  serializeDataBundle,
  type DataBundle,
} from '../../utils/dataBundle';

interface PreparedBundle {
  bundle: DataBundle;
  serialized: string;
  size: number;
}

const formatPreparedAt = (bundle: PreparedBundle | null): string => {
  if (!bundle) return '—';
  const date = new Date(bundle.bundle.createdAt);
  if (Number.isNaN(date.getTime())) return bundle.bundle.createdAt;
  return date.toLocaleString();
};

const buildFileName = (bundle: DataBundle): string => {
  const safeTimestamp = bundle.createdAt.replace(/[:.]/g, '-');
  return `kali-portfolio-backup-${safeTimestamp}.json`;
};

const DataExport: React.FC = () => {
  const [prepared, setPrepared] = useState<PreparedBundle | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preparedRef = useRef<PreparedBundle | null>(null);
  const busyRef = useRef(false);

  const refreshBundle = useCallback(async (): Promise<PreparedBundle | null> => {
    if (busyRef.current) {
      return preparedRef.current;
    }
    busyRef.current = true;
    setIsBusy(true);
    setError(null);
    try {
      const bundle = await createDataBundle();
      const serialized = serializeDataBundle(bundle);
      const size = estimateBundleSize(serialized);
      const next: PreparedBundle = { bundle, serialized, size };
      preparedRef.current = next;
      setPrepared(next);
      setStatus(`Bundle prepared ${formatPreparedAt(next)}.`);
      return next;
    } catch (err) {
      console.error('Failed to prepare export bundle', err);
      setError('Unable to prepare export bundle. Try again in a moment.');
      return null;
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshBundle();
  }, [refreshBundle]);

  const sizeLabel = useMemo(() => {
    if (!prepared) return 'Calculating…';
    return formatBundleSize(prepared.size);
  }, [prepared]);

  const handleDownload = useCallback(async () => {
    setError(null);
    let current = prepared;
    if (!current) {
      current = await refreshBundle();
    }
    if (!current) return;

    try {
      const blob = new Blob([current.serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = buildFileName(current.bundle);
      anchor.rel = 'noopener';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus('Download started. Store the backup safely to restore later.');
    } catch (err) {
      console.error('Failed to trigger download', err);
      setError('Unable to start download. Your browser may block automatic downloads.');
    }
  }, [prepared, refreshBundle]);

  const handleFilePicker = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsBusy(true);
      setError(null);
      setStatus(null);
      try {
        const text = await file.text();
        const bundle = parseDataBundle(text);
        await applyDataBundle(bundle);
        setStatus('Backup restored. Reload open apps to see updated data.');
        await refreshBundle();
      } catch (err) {
        console.error('Failed to import bundle', err);
        setError('The selected file is not a recognised backup bundle.');
      } finally {
        setIsBusy(false);
        busyRef.current = false;
        event.target.value = '';
      }
    },
    [refreshBundle],
  );

  return (
    <section className="rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-white shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data backup &amp; restore</h2>
          <p className="mt-1 text-white/70">
            Export desktop settings, launcher favourites, templates, recents, and workspace data into a
            single JSON bundle.
          </p>
        </div>
        <div className="text-right text-xs uppercase tracking-wide text-white/60">
          <p>Estimated size</p>
          <p className="text-base font-semibold text-white">{sizeLabel}</p>
          <p className="mt-1">Prepared: {formatPreparedAt(prepared)}</p>
        </div>
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-white/60 sm:text-sm">
        <li>Desktop appearance and accessibility settings</li>
        <li>Launcher favourites, recent apps, and snap preferences</li>
        <li>Templates for Recon-ng, Sokoban packs, scanner schedules, and Hydra sessions</li>
        <li>Workspace data including portfolio tasks, plugin states, and QR history</li>
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refreshBundle()}
          disabled={isBusy}
          className="rounded bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh estimate
        </button>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={isBusy}
          className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-ub-orange/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download backup
        </button>
        <button
          type="button"
          onClick={handleFilePicker}
          disabled={isBusy}
          className="rounded border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restore from file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          aria-label="Import data bundle"
          onChange={handleImport}
        />
      </div>

      <div className="mt-4 space-y-2 text-xs sm:text-sm" aria-live="polite">
        {status && <p className="text-emerald-300" role="status">{status}</p>}
        {error && <p className="text-red-400" role="alert">{error}</p>}
      </div>
    </section>
  );
};

export default DataExport;
