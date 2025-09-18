"use client";

import { ChangeEvent, useMemo, useState } from "react";
import apps from "../../apps.config";
import {
  FocusDeliveryMode,
  useFocusMode,
} from "../../hooks/useFocusMode";

const uniqueAppList = () => {
  const map = new Map<string, { id: string; title: string }>();
  apps.forEach((app) => {
    if (!map.has(app.id)) {
      map.set(app.id, { id: app.id, title: app.title });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
};

const FocusSettingsPage = () => {
  const {
    config,
    updateConfig,
    updateAppOverride,
    clearAppOverrides,
    getAppDeliveryMode,
    isFocusActive,
    startFocus,
    stopFocus,
    triggerSummaryNow,
    nextSummaryAt,
  } = useFocusMode();

  const [query, setQuery] = useState("");

  const appsList = useMemo(uniqueAppList, []);
  const filteredApps = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return appsList;
    return appsList.filter(
      (app) =>
        app.title.toLowerCase().includes(term) ||
        app.id.toLowerCase().includes(term),
    );
  }, [appsList, query]);

  const handleIntervalChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(5, Math.min(180, Math.round(parsed)));
    updateConfig({ summaryIntervalMinutes: clamped });
  };

  const handleSilenceToggle = (event: ChangeEvent<HTMLInputElement>) => {
    updateConfig({ silenceNotifications: event.target.checked });
  };

  const nextSummaryLabel = nextSummaryAt
    ? new Date(nextSummaryAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

  const overrideCount = Object.keys(config.perAppOverrides).length;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <section className="rounded-lg border border-gray-700 bg-gray-900/80 p-4 shadow-inner">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Focus mode</h1>
            <p className="text-sm text-gray-300">
              Bundle low-priority notifications and stay in flow.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              isFocusActive ? "bg-green-600/70" : "bg-gray-600/70"
            }`}
          >
            {isFocusActive ? "Active" : "Paused"}
          </span>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={isFocusActive ? stopFocus : startFocus}
            className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold uppercase tracking-wide text-black transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-ub-orange"
          >
            {isFocusActive ? "End session" : "Start focus"}
          </button>
          <button
            type="button"
            onClick={triggerSummaryNow}
            disabled={!isFocusActive}
            className="rounded border border-gray-600 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-400"
          >
            Deliver summary now
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span>Summary every</span>
            <input
              type="number"
              min={5}
              max={180}
              value={config.summaryIntervalMinutes}
              onChange={(event) => handleIntervalChange(event.target.value)}
              className="w-20 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-ub-orange"
            />
            <span>minutes</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
              checked={config.silenceNotifications}
              onChange={handleSilenceToggle}
            />
            <span>Silence toast alerts during focus</span>
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Next summary:
          <span className="ml-2 font-medium text-gray-200">
            {isFocusActive ? nextSummaryLabel : "Focus mode paused"}
          </span>
        </p>
      </section>

      <section className="rounded-lg border border-gray-700 bg-gray-900/70 p-4 shadow-inner">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Per-app delivery</h2>
            <p className="text-sm text-gray-300">
              Choose which apps can break through or stay bundled during focus.
            </p>
          </div>
          <button
            type="button"
            onClick={clearAppOverrides}
            disabled={overrideCount === 0}
            className="rounded border border-gray-600 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
          >
            Clear overrides
          </button>
        </header>
        <div className="mb-3 flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter apps…"
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ub-orange"
          />
        </div>
        <div className="max-h-[45vh] overflow-y-auto rounded border border-gray-800 bg-black/20">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2 font-semibold">App</th>
                <th className="px-4 py-2 font-semibold">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => {
                const mode = getAppDeliveryMode(app.id);
                return (
                  <tr key={app.id} className="border-t border-gray-800 text-gray-100">
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{app.title}</span>
                        <span className="text-xs text-gray-400">{app.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={mode}
                        onChange={(event) =>
                          updateAppOverride(app.id, event.target.value as FocusDeliveryMode)
                        }
                        className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ub-orange"
                      >
                        <option value="bundle">Bundle in summaries</option>
                        <option value="immediate">Deliver immediately</option>
                        <option value="mute">Mute during focus</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filteredApps.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-6 text-center text-xs text-gray-400"
                  >
                    No apps matched your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {overrideCount > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            Overrides in effect:{" "}
            {Object.entries(config.perAppOverrides)
              .map(([id, mode]) => `${id} → ${mode}`)
              .join(", ")}
          </p>
        )}
      </section>
    </div>
  );
};

export default FocusSettingsPage;
