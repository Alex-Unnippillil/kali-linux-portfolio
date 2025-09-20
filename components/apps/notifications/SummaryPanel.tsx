'use client';

import React, { useMemo } from 'react';
import type {
  NotificationGroup,
  NotificationSummaryStats,
} from '../../../hooks/useNotifications';
import {
  minutesFromMs,
  SUMMARY_INTERVAL_OPTIONS_MINUTES,
  msFromMinutes,
} from '../../../utils/settings/notificationPreferences';

interface SummaryPanelProps {
  groups: NotificationGroup[];
  hiddenGroupCount: number;
  doNotDisturb: boolean;
  onToggleDoNotDisturb: (value: boolean) => void;
  summaryInterval: number;
  onChangeSummaryInterval: (value: number) => void;
  triggerSummary: () => void;
  nextSummaryAt: number | null;
  summaryStats: NotificationSummaryStats;
  totalGroups: number;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes <= 0) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const formatIntervalLabel = (minutes: number) => {
  if (minutes === 60) return '60 minutes (1 hour)';
  if (minutes > 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${minutes} minutes (${hours} hours)`;
  }
  return `${minutes} minutes`;
};

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  groups,
  hiddenGroupCount,
  doNotDisturb,
  onToggleDoNotDisturb,
  summaryInterval,
  onChangeSummaryInterval,
  triggerSummary,
  nextSummaryAt,
  summaryStats,
  totalGroups,
}) => {
  const intervalMinutes = minutesFromMs(summaryInterval);

  const availableIntervals = useMemo(() => {
    const base = [...SUMMARY_INTERVAL_OPTIONS_MINUTES];
    if (!base.includes(intervalMinutes)) {
      base.push(intervalMinutes);
    }
    return base.sort((a, b) => a - b);
  }, [intervalMinutes]);

  const reductionLabel = useMemo(() => {
    if (!summaryStats.rawCount) return 'No notifications yet in this window.';
    const saved = Math.max(0, summaryStats.rawCount - summaryStats.cardCount);
    const percent = summaryStats.rawCount
      ? Math.round((saved / summaryStats.rawCount) * 100)
      : 0;
    return `Condensed ${summaryStats.rawCount} notifications into ${summaryStats.cardCount} cards (${percent}% reduction).`;
  }, [summaryStats]);

  const hiddenMessage = hiddenGroupCount
    ? `${hiddenGroupCount} notification ${
        hiddenGroupCount === 1 ? 'group is' : 'groups are'
      } muted by Do Not Disturb.`
    : '';

  return (
    <section
      aria-labelledby="notification-summary-title"
      className="rounded-lg border border-ubt-cool-grey bg-ub-cool-grey/60 p-4 text-ubt-grey shadow-lg"
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2
            id="notification-summary-title"
            className="text-lg font-semibold text-white"
          >
            Notification summary
          </h2>
          <p className="text-sm" aria-live="polite">
            {reductionLabel}
          </p>
          {nextSummaryAt && (
            <p className="text-xs text-ubt-grey/80" role="status">
              Next summary at {formatTime(nextSummaryAt)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <button
            type="button"
            role="switch"
            aria-checked={doNotDisturb}
            onClick={() => onToggleDoNotDisturb(!doNotDisturb)}
            className={`rounded-full px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              doNotDisturb
                ? 'bg-yellow-600 text-black focus-visible:ring-yellow-400'
                : 'bg-ub-dark text-white focus-visible:ring-sky-500'
            }`}
          >
            {doNotDisturb ? 'Do Not Disturb: On' : 'Do Not Disturb: Off'}
          </button>
          <label className="flex flex-col text-xs uppercase tracking-wide">
            Summary interval
            <select
              value={intervalMinutes}
              onChange={event => {
                const minutes = Number.parseInt(event.target.value, 10);
                const ms = msFromMinutes(minutes);
                onChangeSummaryInterval(ms);
              }}
              className="mt-1 rounded border border-ubt-cool-grey bg-ub-dark px-3 py-1 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Summary interval"
            >
              {availableIntervals.map(option => (
                <option key={option} value={option}>
                  {formatIntervalLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={triggerSummary}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Summarize now
          </button>
        </div>
      </header>

      {hiddenMessage && (
        <p className="mt-3 text-sm text-amber-300" aria-live="polite">
          {hiddenMessage}
        </p>
      )}

      <div className="mt-4">
        {groups.length > 0 ? (
          <ul role="list" className="flex flex-col gap-3">
            {groups.map(group => (
              <li
                key={`${group.appId}-${group.subject}`}
                role="listitem"
                tabIndex={0}
                className={`rounded-lg border px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 ${
                  group.isCritical
                    ? 'border-red-500/80 bg-red-900/20 text-red-100'
                    : 'border-ubt-cool-grey bg-ub-dark/70 text-ubt-grey'
                }`}
                aria-label={`${group.subject} from ${group.appId}. ${group.totalCount} notifications in this window.`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wide text-ubt-grey/70">
                      {group.appId}
                    </span>
                    <span className="text-base font-semibold text-white">
                      {group.subject}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-semibold text-white">{group.totalCount}</span>
                    <span className="ml-1 text-ubt-grey/70">
                      {group.totalCount === 1 ? 'alert' : 'alerts'}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ubt-grey/90">
                  {group.lastBody}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ubt-grey/70">
                  <span>{`Last activity ${formatRelativeTime(group.lastDate)}`}</span>
                  <span aria-hidden="true">•</span>
                  <span>{`${group.occurrences.length} unique ${
                    group.occurrences.length === 1 ? 'burst' : 'bursts'
                  }`}</span>
                  {group.isCritical && (
                    <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
                      Critical
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className="rounded border border-dashed border-ubt-cool-grey bg-ub-dark/60 p-4 text-center text-sm text-ubt-grey"
          >
            You're all caught up. No notifications in this summary window.
          </p>
        )}
      </div>

      <footer className="mt-4 text-xs text-ubt-grey/60">
        Tracking {totalGroups} grouped subjects across all apps.
      </footer>
    </section>
  );
};

export default SummaryPanel;
