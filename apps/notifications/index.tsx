'use client';

import React, { useMemo } from 'react';
import NotificationCenter from '../../components/common/NotificationCenter';
import SummaryPanel from '../../components/apps/notifications/SummaryPanel';
import useNotifications, {
  type NotificationGroup,
} from '../../hooks/useNotifications';

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

const NotificationsDashboard: React.FC = () => {
  const {
    summaryGroups,
    hiddenGroupCount,
    doNotDisturb,
    setDoNotDisturb,
    summaryInterval,
    setSummaryInterval,
    triggerSummary,
    nextSummaryAt,
    summaryStats,
    totalSummaryGroups,
    groupedNotifications,
  } = useNotifications();

  const groupsByApp = useMemo(() => {
    return groupedNotifications.reduce<Record<string, NotificationGroup[]>>(
      (acc, group) => {
        if (!acc[group.appId]) acc[group.appId] = [];
        acc[group.appId].push(group);
        return acc;
      },
      {},
    );
  }, [groupedNotifications]);

  const appEntries = useMemo(() => Object.entries(groupsByApp), [groupsByApp]);

  return (
    <main
      role="main"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-ub-dark/80 p-4 text-ubt-grey"
      aria-label="Notification center"
    >
      <SummaryPanel
        groups={summaryGroups}
        hiddenGroupCount={hiddenGroupCount}
        doNotDisturb={doNotDisturb}
        onToggleDoNotDisturb={setDoNotDisturb}
        summaryInterval={summaryInterval}
        onChangeSummaryInterval={setSummaryInterval}
        triggerSummary={triggerSummary}
        nextSummaryAt={nextSummaryAt}
        summaryStats={summaryStats}
        totalGroups={totalSummaryGroups}
      />

      <section
        aria-labelledby="notification-by-app"
        className="rounded-lg border border-ubt-cool-grey bg-ub-cool-grey/40"
      >
        <header className="border-b border-ubt-cool-grey/60 px-4 py-3">
          <h2
            id="notification-by-app"
            className="text-lg font-semibold text-white"
          >
            By application
          </h2>
          <p className="text-sm text-ubt-grey/80">
            Detailed grouped alerts for each application. Use arrow keys to
            explore cards and press Enter to focus a summary.
          </p>
        </header>
        {appEntries.length > 0 ? (
          <div className="divide-y divide-ubt-cool-grey/40" role="list">
            {appEntries.map(([appId, groups]) => {
              const total = groups.reduce((sum, group) => sum + group.totalCount, 0);
              return (
                <article
                  key={appId}
                  role="region"
                  aria-labelledby={`app-section-${appId}`}
                  className="focus-within:ring-2 focus-within:ring-sky-400 focus-within:ring-offset-2"
                >
                  <header className="flex items-center justify-between gap-2 px-4 py-3">
                    <h3
                      id={`app-section-${appId}`}
                      className="text-base font-semibold text-white"
                    >
                      {appId}
                    </h3>
                    <span className="text-xs uppercase tracking-wide text-ubt-grey/70">
                      {total} {total === 1 ? 'alert' : 'alerts'}
                    </span>
                  </header>
                  <ul
                    role="list"
                    className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {groups.map(group => (
                      <li
                        key={`${group.appId}-${group.subject}`}
                        role="listitem"
                        tabIndex={0}
                        className={`rounded-lg border px-3 py-3 text-sm shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 ${
                          group.isCritical
                            ? 'border-red-500/70 bg-red-900/20 text-red-100'
                            : 'border-ubt-cool-grey/70 bg-ub-dark/70 text-ubt-grey'
                        }`}
                        aria-label={`${group.subject} in ${group.appId}, ${group.totalCount} total notifications. Last seen ${formatRelativeTime(group.lastDate)}.`}
                      >
                        <p className="text-sm font-semibold text-white">
                          {group.subject}
                        </p>
                        <p className="mt-1 text-xs text-ubt-grey/80">
                          {group.lastBody}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ubt-grey/70">
                          <span>
                            {group.totalCount}{' '}
                            {group.totalCount === 1 ? 'alert' : 'alerts'}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>
                            {group.occurrences.length}{' '}
                            {group.occurrences.length === 1 ? 'burst' : 'bursts'}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>{formatRelativeTime(group.lastDate)}</span>
                          {group.isCritical && (
                            <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Critical
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        ) : (
          <p
            role="status"
            className="px-4 py-6 text-center text-sm text-ubt-grey"
          >
            No notifications have been received yet. When apps emit alerts they
            will appear here grouped by subject.
          </p>
        )}
      </section>
    </main>
  );
};

const NotificationsApp: React.FC = () => (
  <NotificationCenter>
    <NotificationsDashboard />
  </NotificationCenter>
);

export default NotificationsApp;
