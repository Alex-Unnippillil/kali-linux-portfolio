"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "../../../ToggleSwitch";
import {
  TELEMETRY_CATEGORIES,
  type TelemetryPreferences,
  getTelemetryPreferences,
  setTelemetryPreference,
  subscribeToTelemetryPreferences,
} from "../../../../modules/telemetry/preferences";
import {
  getBufferStats,
  subscribeToTelemetryBuffer,
  resetTelemetryBuffer,
  type BufferStats,
} from "../../../../modules/telemetry/buffer";
import { flushAnalyticsEvents } from "../../../../utils/analytics";

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const precision = index === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[index]}`;
};

const channelTitles: Record<string, string> = TELEMETRY_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category.title;
    return acc;
  },
  {} as Record<string, string>,
);

export default function TelemetryControls() {
  const [preferences, setPreferences] = useState<TelemetryPreferences>(() =>
    getTelemetryPreferences(),
  );
  const [stats, setStats] = useState<BufferStats>(() => getBufferStats());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTelemetryPreferences(setPreferences);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToTelemetryBuffer(setStats);
    return () => unsubscribe();
  }, []);

  const analyticsStats = stats.byChannel.analytics;

  const handleToggle = (channel: keyof TelemetryPreferences, enabled: boolean) => {
    setTelemetryPreference(channel, enabled);
    setStatusMessage(null);
  };

  const handleFlush = () => {
    const sent = flushAnalyticsEvents();
    if (sent > 0) {
      setStatusMessage(`Dispatched ${sent} analytics event${sent === 1 ? "" : "s"}.`);
    } else {
      setStatusMessage(
        "No analytics events ready to send or analytics dispatch is disabled.",
      );
    }
  };

  const handlePurge = () => {
    resetTelemetryBuffer();
    setStatusMessage("Telemetry buffer cleared without sending data.");
  };

  return (
    <section className="space-y-4 px-4 py-4 text-ubt-grey">
      <header className="space-y-2 rounded border border-ubt-cool-grey bg-black/20 p-4">
        <h2 className="text-lg font-semibold text-white">Telemetry & Privacy</h2>
        <p>
          Telemetry is <strong>opt-in</strong>. Categories stay off until you flip a
          switch. All events are anonymized and stored locally in an in-memory buffer
          until you decide to flush or purge them.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {TELEMETRY_CATEGORIES.map((category) => {
          const descriptionId = `${category.id}-description`;
          return (
            <article
              key={category.id}
              className="space-y-2 rounded border border-ubt-cool-grey bg-black/10 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">{category.title}</h3>
                  <p id={descriptionId} className="text-sm text-ubt-grey">
                    {category.description}
                  </p>
                </div>
                <ToggleSwitch
                  ariaLabel={`Toggle ${category.title}`}
                  checked={preferences[category.id]}
                  onChange={(value) => handleToggle(category.id, value)}
                />
              </div>
              <details className="rounded bg-black/30 p-3 text-xs text-ubt-grey">
                <summary className="cursor-pointer text-white">
                  What this includes
                </summary>
                <p className="pt-2 leading-relaxed">{category.documentation}</p>
              </details>
              <footer className="text-xs text-ubt-grey">
                Buffered {channelTitles[category.id]} events: {stats.byChannel[category.id].events} (
                {formatBytes(stats.byChannel[category.id].bytes)})
              </footer>
            </article>
          );
        })}
      </div>

      <div className="space-y-3 rounded border border-ubt-cool-grey bg-black/20 p-4">
        <h3 className="text-base font-semibold text-white">Telemetry buffer</h3>
        <p className="text-sm">
          Currently queued events: <strong>{stats.totalEvents}</strong> totaling{' '}
          <strong>{formatBytes(stats.totalBytes)}</strong> across all categories.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleFlush}
            disabled={analyticsStats.events === 0}
            className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Flush analytics events
          </button>
          <button
            type="button"
            onClick={handlePurge}
            disabled={stats.totalEvents === 0}
            className="rounded border border-ub-orange px-4 py-2 text-sm font-semibold text-ub-orange disabled:opacity-40"
          >
            Purge all buffered data
          </button>
        </div>
        <p className="text-xs text-ubt-grey">
          Flushing sends opted-in analytics events to their destination. Purging clears
          the buffer locally without sending anything.
        </p>
        {statusMessage && (
          <p role="status" className="text-xs text-ubt-grey">
            {statusMessage}
          </p>
        )}
      </div>
    </section>
  );
}
