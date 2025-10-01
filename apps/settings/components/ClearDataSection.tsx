'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import {
  defaults,
  getAccent as loadAccent,
  getWallpaper as loadWallpaper,
  getUseKaliWallpaper as loadUseKaliWallpaper,
  getDensity as loadDensity,
  getReducedMotion as loadReducedMotion,
  getFontScale as loadFontScale,
  getHighContrast as loadHighContrast,
  getLargeHitAreas as loadLargeHitAreas,
  getPongSpin as loadPongSpin,
  getAllowNetwork as loadAllowNetwork,
  getHaptics as loadHaptics,
} from '../../../utils/settingsStore';
import { getTheme as loadTheme } from '../../../utils/theme';
import {
  captureDataSnapshot,
  clearClientData,
  restoreDataSnapshot,
  DataSnapshot,
} from '../../../utils/dataReset';
import { logEvent } from '../../../utils/analytics';
import logger from '../../../utils/logger';

const CONFIRMATION_PHRASE = 'CLEAR ALL DATA';
const UNDO_DURATION_MS = 10_000;

const summaryItems = [
  'Desktop personalization (theme, wallpaper, density, accents).',
  'Saved games, replays, keyboard shortcuts, and high scores stored offline.',
  'Recent apps, installed plug-ins, lab mode flags, and cached tool data.',
  'Any other settings saved to this browser via localStorage or IndexedDB.',
];

const formatSeconds = (msRemaining: number): number => {
  const seconds = Math.ceil(msRemaining / 1000);
  return seconds > 0 ? seconds : 0;
};

export default function ClearDataSection() {
  const {
    setAccent,
    setWallpaper,
    setUseKaliWallpaper,
    setDensity,
    setReducedMotion,
    setFontScale,
    setHighContrast,
    setLargeHitAreas,
    setPongSpin,
    setAllowNetwork,
    setHaptics,
    setTheme,
  } = useSettings();

  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'clearing' | 'undoing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [undoDeadline, setUndoDeadline] = useState<number | null>(null);
  const [undoSeconds, setUndoSeconds] = useState<number>(0);

  const snapshotRef = useRef<DataSnapshot | null>(null);
  const reloadTimeoutRef = useRef<number | null>(null);

  const confirmationMatches = useMemo(
    () => inputValue.trim().toUpperCase() === CONFIRMATION_PHRASE,
    [inputValue],
  );

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      if (reloadTimeoutRef.current !== null) {
        window.clearTimeout(reloadTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (undoDeadline === null) {
      setUndoSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = undoDeadline - Date.now();
      if (remaining <= 0) {
        snapshotRef.current = null;
        setUndoDeadline(null);
        setUndoSeconds(0);
        return;
      }
      setUndoSeconds(formatSeconds(remaining));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 250);
    return () => {
      window.clearInterval(interval);
    };
  }, [undoDeadline]);

  const applyDefaults = () => {
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setUseKaliWallpaper(defaults.useKaliWallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setLargeHitAreas(defaults.largeHitAreas);
    setPongSpin(defaults.pongSpin);
    setAllowNetwork(defaults.allowNetwork);
    setHaptics(defaults.haptics);
    setTheme('default');
  };

  const hydrateFromStorage = async () => {
    try {
      const [
        accent,
        wallpaper,
        useKaliWallpaper,
        density,
        reducedMotion,
        fontScale,
        highContrast,
        largeHitAreas,
        pongSpin,
        allowNetwork,
        haptics,
      ] = await Promise.all([
        loadAccent(),
        loadWallpaper(),
        loadUseKaliWallpaper(),
        loadDensity(),
        loadReducedMotion(),
        loadFontScale(),
        loadHighContrast(),
        loadLargeHitAreas(),
        loadPongSpin(),
        loadAllowNetwork(),
        loadHaptics(),
      ]);

      setAccent(accent);
      setWallpaper(wallpaper);
      setUseKaliWallpaper(useKaliWallpaper);
      setDensity(density as any);
      setReducedMotion(reducedMotion);
      setFontScale(fontScale);
      setHighContrast(highContrast);
      setLargeHitAreas(largeHitAreas);
      setPongSpin(pongSpin);
      setAllowNetwork(allowNetwork);
      setHaptics(haptics);
      setTheme(loadTheme());
    } catch (err) {
      logger.error('Failed to hydrate settings after undo', err);
    }
  };

  const scheduleReload = () => {
    if (typeof window === 'undefined') return;
    if (reloadTimeoutRef.current !== null) {
      window.clearTimeout(reloadTimeoutRef.current);
    }
    reloadTimeoutRef.current = window.setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        // ignore reload failures in non-browser environments
      }
    }, UNDO_DURATION_MS);
  };

  const handleClear = async () => {
    if (!confirmationMatches || status !== 'idle' || undoDeadline !== null) return;
    setStatus('clearing');
    setError(null);

    let snapshot: DataSnapshot | null = null;

    try {
      snapshot = await captureDataSnapshot();
      snapshotRef.current = snapshot;
      await clearClientData(snapshot);
      applyDefaults();
      setInputValue('');
      setUndoDeadline(Date.now() + UNDO_DURATION_MS);
      setUndoSeconds(formatSeconds(UNDO_DURATION_MS));
      scheduleReload();
      logEvent({ category: 'settings', action: 'clear_all_data' });
    } catch (err) {
      logger.error('Failed to clear stored data', err);
      setError('Unable to clear data. Please try again.');
      if (snapshot) {
        try {
          await restoreDataSnapshot(snapshot);
        } catch (restoreErr) {
          logger.error('Failed to restore snapshot after clear failure', restoreErr);
        }
      }
      snapshotRef.current = null;
    } finally {
      setStatus('idle');
    }
  };

  const handleUndo = async () => {
    const snapshot = snapshotRef.current;
    if (!snapshot || status !== 'idle') return;

    setStatus('undoing');
    setError(null);
    try {
      await restoreDataSnapshot(snapshot);
      await hydrateFromStorage();
      logEvent({ category: 'settings', action: 'clear_all_data_undo' });
    } catch (err) {
      logger.error('Failed to undo data clear', err);
      setError('Undo failed. Your data may already be gone.');
    } finally {
      snapshotRef.current = null;
      setUndoDeadline(null);
      setUndoSeconds(0);
      if (typeof window !== 'undefined' && reloadTimeoutRef.current !== null) {
        window.clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      setStatus('idle');
    }
  };

  const disableClearButton =
    !confirmationMatches || status !== 'idle' || undoDeadline !== null;

  return (
    <section className="mt-6 border-t border-gray-900 pt-6 text-ubt-grey">
      <h3 className="text-lg font-semibold">Clear all data</h3>
      <p className="mt-2 text-sm text-ubt-grey/80">
        This will erase everything saved locally in this browser and return the desktop to
        its initial state. The following data will be removed:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-ubt-grey/80">
        {summaryItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <label htmlFor="clear-data-confirm" className="mt-4 block text-sm font-medium">
        Type <span className="font-semibold">{CONFIRMATION_PHRASE}</span> to confirm.
      </label>
        <input
          id="clear-data-confirm"
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          className="mt-2 w-full rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-sm text-white focus:border-ub-orange focus:outline-none"
          placeholder={CONFIRMATION_PHRASE}
          aria-describedby="clear-data-helper"
          aria-label="Confirmation phrase"
        />
      <p id="clear-data-helper" className="mt-2 text-xs text-ubt-grey/60">
        A 10 second undo window will be shown after you clear everything.
      </p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleClear}
        disabled={disableClearButton}
        className="mt-4 rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ubt-grey"
      >
        {status === 'clearing' ? 'Clearing…' : 'Clear all data'}
      </button>
      {undoDeadline !== null && snapshotRef.current && (
        <div className="mt-4 flex flex-col gap-2 rounded border border-ubt-cool-grey bg-black/30 p-4 text-sm">
          <p>
            Local data deleted. You have <strong>{undoSeconds}</strong> second
            {undoSeconds === 1 ? '' : 's'} to undo.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={status !== 'idle'}
              className="rounded bg-white/10 px-3 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-white/5"
            >
              {status === 'undoing' ? 'Restoring…' : 'Undo'}
            </button>
            <span className="self-center text-xs text-ubt-grey/70">
              The desktop will reload automatically when the timer expires.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
