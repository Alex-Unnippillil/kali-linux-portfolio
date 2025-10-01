"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useNotifications } from '../../hooks/useNotifications';
import { safeLocalStorage } from '../../utils/safeStorage';
import { readRecentAppIds, writeRecentAppIds } from '../../utils/recentStorage';
import {
  REPRO_BUNDLE_VERSION,
  buildReproBundle,
  collectLocalState,
  applyReproBundle,
  type SettingsHydrator,
  type NotificationsHydrator,
} from '../../utils/dev/reproBundle';
import { recordLog, recordStep } from '../../utils/dev/reproRecorder';

const buttonBaseClass =
  'inline-flex items-center justify-center rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60';

const ReproExporter: React.FC = () => {
  const settings = useSettings();
  const notifications = useNotifications();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const settingsHydrator: SettingsHydrator = useMemo(
    () => ({
      setAccent: settings.setAccent,
      setWallpaper: settings.setWallpaper,
      setUseKaliWallpaper: settings.setUseKaliWallpaper,
      setDensity: settings.setDensity,
      setReducedMotion: settings.setReducedMotion,
      setFontScale: settings.setFontScale,
      setHighContrast: settings.setHighContrast,
      setLargeHitAreas: settings.setLargeHitAreas,
      setPongSpin: settings.setPongSpin,
      setAllowNetwork: settings.setAllowNetwork,
      setHaptics: settings.setHaptics,
      setTheme: settings.setTheme,
    }),
    [
      settings.setAccent,
      settings.setWallpaper,
      settings.setUseKaliWallpaper,
      settings.setDensity,
      settings.setReducedMotion,
      settings.setFontScale,
      settings.setHighContrast,
      settings.setLargeHitAreas,
      settings.setPongSpin,
      settings.setAllowNetwork,
      settings.setHaptics,
      settings.setTheme,
    ],
  );

  const notificationsHydrator: NotificationsHydrator = useMemo(
    () => ({ hydrateNotifications: notifications.hydrateNotifications }),
    [notifications.hydrateNotifications],
  );

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const localState = {
        recentApps: readRecentAppIds(),
        storage: collectLocalState(safeLocalStorage ?? undefined),
      };
      const bundle = buildReproBundle(settings, notifications.notificationsByApp, localState);
      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = bundle.exportedAt.replace(/[:.]/g, '-');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kali-repro-${timestamp}.json`;
      anchor.rel = 'noopener';
      anchor.click();
      URL.revokeObjectURL(url);
      recordStep('dev:repro-export', { version: bundle.version });
      recordLog('info', 'repro:export-success', { version: bundle.version });
      setStatus(`Exported reproduction bundle v${bundle.version}`);
    } catch (error) {
      console.error('Failed to export reproduction bundle', error);
      recordLog('error', 'repro:export-failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      setStatus('Failed to export reproduction bundle');
    } finally {
      setBusy(false);
    }
  }, [busy, notifications.notificationsByApp, settings]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setBusy(true);
      setStatus(null);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const result = applyReproBundle(
          parsed,
          { settings: settingsHydrator, notifications: notificationsHydrator },
          {
            storage: safeLocalStorage ?? undefined,
            writeRecentApps: writeRecentAppIds,
          },
        );
        recordStep('dev:repro-import', { version: result.version });
        recordLog('info', 'repro:import-success', { version: result.version });
        setStatus(`Imported reproduction bundle v${result.version}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kali:repro-imported', { detail: { version: result.version } }));
        }
      } catch (error) {
        console.error('Failed to import reproduction bundle', error);
        recordLog('error', 'repro:import-failure', {
          error: error instanceof Error ? error.message : String(error),
        });
        setStatus('Failed to import reproduction bundle');
      } finally {
        resetFileInput();
        setBusy(false);
      }
    },
    [notificationsHydrator, settingsHydrator],
  );

  return (
    <section className="rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-4 text-slate-100">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Reproduction bundle</h2>
        <span className="text-[0.65rem] uppercase text-slate-400">v{REPRO_BUNDLE_VERSION}</span>
      </header>
      <p className="mb-4 text-xs text-slate-300">
        Export anonymized UI state, QA steps, and logs to help debug reports. Importing will replace current settings and desktop
        session data with the bundle snapshot.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonBaseClass} onClick={handleExport} disabled={busy}>
          Export bundle
        </button>
        <label className={`${buttonBaseClass} cursor-pointer relative overflow-hidden`}>
          <span>Import bundle</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Import reproduction bundle"
            onChange={handleImport}
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className={`${buttonBaseClass} border-slate-500 bg-slate-900/80 hover:bg-slate-800/80`}
          onClick={() => {
            recordStep('dev:repro-reset-status', {});
            setStatus(null);
            resetFileInput();
          }}
          disabled={busy}
        >
          Clear status
        </button>
      </div>
      {status && <p className="mt-3 text-xs text-slate-300" role="status">{status}</p>}
    </section>
  );
};

export default ReproExporter;
