import React, { useEffect, useMemo, useRef, useState } from 'react';
import { startupEntries, StartupEntry } from '../../../utils/startupEntries';
import { safeLocalStorage } from '../../../utils/safeStorage';
import {
  logStartupDelayChange,
  logStartupImpactSnapshot,
  logStartupToggle,
} from '../../../utils/analytics';

const STORAGE_KEY = 'startup-manager-preferences';

interface StartupPreferences {
  enabled: Record<string, boolean>;
  delays: Record<string, number>;
}

const clampDelay = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(120, Math.max(0, Math.round(value)));
};

const createDefaultPreferences = (): StartupPreferences => ({
  enabled: startupEntries.reduce<Record<string, boolean>>((acc, entry) => {
    acc[entry.id] = entry.defaultEnabled;
    return acc;
  }, {}),
  delays: startupEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.id] = entry.defaultDelay;
    return acc;
  }, {}),
});

const readStoredPreferences = (): StartupPreferences => {
  const defaults = createDefaultPreferences();
  if (!safeLocalStorage) return defaults;
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StartupPreferences>;
    const enabled = { ...defaults.enabled };
    const delays = { ...defaults.delays };

    if (parsed.enabled && typeof parsed.enabled === 'object') {
      Object.entries(parsed.enabled).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          enabled[key] = value;
        }
      });
    }

    if (parsed.delays && typeof parsed.delays === 'object') {
      Object.entries(parsed.delays).forEach(([key, value]) => {
        if (typeof value === 'number') {
          delays[key] = clampDelay(value);
        }
      });
    }

    return { enabled, delays };
  } catch {
    return defaults;
  }
};

const StartupManager: React.FC = () => {
  const [preferences, setPreferences] = useState<StartupPreferences>(() =>
    readStoredPreferences()
  );
  const previousPreferences = useRef<StartupPreferences | null>(null);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      /* ignore storage errors */
    }
  }, [preferences]);

  const totalImpact = useMemo(
    () =>
      startupEntries.reduce(
        (total, entry) =>
          preferences.enabled[entry.id] ? total + entry.impactScore : total,
        0
      ),
    [preferences.enabled]
  );

  const enabledCount = useMemo(
    () =>
      startupEntries.reduce(
        (count, entry) => (preferences.enabled[entry.id] ? count + 1 : count),
        0
      ),
    [preferences.enabled]
  );

  const heavyDisabled = useMemo(
    () =>
      startupEntries.filter(
        (entry) => entry.heavy && !preferences.enabled[entry.id]
      ).length,
    [preferences.enabled]
  );

  useEffect(() => {
    const prev = previousPreferences.current;
    if (!prev) {
      previousPreferences.current = preferences;
      logStartupImpactSnapshot(totalImpact, heavyDisabled);
      return;
    }

    startupEntries.forEach((entry) => {
      const prevEnabled = prev.enabled[entry.id];
      const nextEnabled = preferences.enabled[entry.id];
      if (prevEnabled !== nextEnabled) {
        logStartupToggle(entry.id, nextEnabled, entry.impactScore);
      }

      const prevDelay = prev.delays[entry.id];
      const nextDelay = preferences.delays[entry.id];
      if (prevDelay !== nextDelay) {
        logStartupDelayChange(entry.id, nextDelay);
      }
    });

    previousPreferences.current = preferences;
    logStartupImpactSnapshot(totalImpact, heavyDisabled);
  }, [preferences, totalImpact, heavyDisabled]);

  const toggleEntry = (entry: StartupEntry) => {
    setPreferences((prev) => ({
      enabled: { ...prev.enabled, [entry.id]: !prev.enabled[entry.id] },
      delays: { ...prev.delays },
    }));
  };

  const updateDelay = (entry: StartupEntry, value: number) => {
    const nextDelay = clampDelay(value);
    setPreferences((prev) => {
      const currentDelay = prev.delays[entry.id];
      if (currentDelay === nextDelay) {
        return prev;
      }
      return {
        enabled: { ...prev.enabled },
        delays: { ...prev.delays, [entry.id]: nextDelay },
      };
    });
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Startup Manager</h1>
        <p className="text-sm text-ubt-grey">
          Choose which simulated services run at sign-in, delay lightweight items,
          and monitor how changes affect boot impact.
        </p>
      </header>

      <section className="mb-4 rounded border border-white/10 bg-black/30 p-4">
        <h2 className="text-lg font-semibold">Impact Summary</h2>
        <p className="text-sm text-white/80">
          Enabled entries: {enabledCount} / {startupEntries.length}
        </p>
        <p className="text-sm text-white/80">
          Aggregate impact score: <span className="font-semibold">{totalImpact}</span>
        </p>
        {heavyDisabled > 0 && (
          <p className="mt-2 rounded border border-ub-orange bg-black/30 p-2 text-sm text-ub-orange" role="alert">
            {heavyDisabled} critical service{heavyDisabled > 1 ? 's are' : ' is'} disabled. Boot insights may be delayed.
          </p>
        )}
      </section>

      <div className="space-y-4">
        {startupEntries.map((entry) => {
          const enabled = preferences.enabled[entry.id];
          const delay = preferences.delays[entry.id] ?? entry.defaultDelay;
          return (
            <article
              key={entry.id}
              className="rounded border border-white/10 bg-black/30 p-4 shadow-inner"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{entry.name}</h3>
                  <p className="text-sm text-white/80">{entry.description}</p>
                  <p className="mt-1 text-xs text-ubt-grey">Source: {entry.source}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">
                    {enabled ? 'Enabled at boot' : 'Disabled'}
                  </span>
                  <input
                    aria-label={`Toggle ${entry.name}`}
                    checked={enabled}
                    className="h-5 w-5 accent-ub-orange"
                    onChange={() => toggleEntry(entry)}
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
                <div>
                  Impact score:{' '}
                  <span className="font-semibold text-white">{entry.impactScore}</span>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-white/80">Delay (seconds)</span>
                  <input
                    aria-label={`Delay ${entry.name}`}
                    className="w-20 rounded border border-white/10 bg-ub-dark text-white px-2 py-1"
                    inputMode="numeric"
                    min={0}
                    max={120}
                    onChange={(event) =>
                      updateDelay(entry, Number(event.target.value))
                    }
                    type="number"
                    value={delay}
                  />
                </label>
              </div>

              {entry.heavy && !enabled && (
                <p
                  className="mt-3 rounded border border-ub-orange bg-black/30 p-3 text-sm text-ub-orange"
                  role="alert"
                >
                  {entry.warning ||
                    `${entry.name} is marked as a heavy service. Disable it only if you understand the trade-offs.`}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default StartupManager;
