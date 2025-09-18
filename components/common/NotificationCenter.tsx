import React, { useEffect, useMemo, useRef, useState } from 'react';
import useNotifications from '../../hooks/useNotifications';
import { NotificationMessage, NotificationThread } from './NotificationProvider';

interface DisplayThread {
  thread: NotificationThread;
  visibleNotifications: NotificationMessage[];
}

interface AppGroup {
  appId: string;
  unreadCount: number;
  threads: DisplayThread[];
}

const matchesQuery = (value: string, query: string) =>
  value.toLowerCase().includes(query);

const formatTimestamp = (value: number) =>
  new Date(value).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });

const NotificationCenter: React.FC = () => {
  const { apps, toggleThreadCollapse, runAction } = useNotifications();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const threadRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const groups = useMemo<AppGroup[]>(() => {
    const result: AppGroup[] = [];
    const entries = Object.entries(apps);

    entries.forEach(([appId, threads]) => {
      const filteredThreads: DisplayThread[] = threads
        .map(thread => {
          if (!query) {
            return {
              thread,
              visibleNotifications: thread.notifications,
            };
          }
          const appMatches = appId.toLowerCase().includes(query);
          const titleMatches = thread.title.toLowerCase().includes(query);
          const matchingNotifications = thread.notifications.filter(note =>
            matchesQuery(note.message, query)
          );
          if (!appMatches && !titleMatches && matchingNotifications.length === 0) {
            return null;
          }
          return {
            thread,
            visibleNotifications:
              matchingNotifications.length > 0
                ? matchingNotifications
                : thread.notifications,
          };
        })
        .filter((value): value is DisplayThread => value !== null)
        .sort((a, b) => b.thread.lastTimestamp - a.thread.lastTimestamp);

      if (filteredThreads.length > 0) {
        result.push({
          appId,
          unreadCount: filteredThreads.reduce(
            (sum, entry) => sum + entry.thread.unreadCount,
            0
          ),
          threads: filteredThreads,
        });
      }
    });

    result.sort((a, b) => {
      const aLatest = a.threads[0]?.thread.lastTimestamp ?? 0;
      const bLatest = b.threads[0]?.thread.lastTimestamp ?? 0;
      return bLatest - aLatest;
    });

    return result;
  }, [apps, query]);

  const totalThreads = useMemo(
    () => groups.reduce((sum, group) => sum + group.threads.length, 0),
    [groups]
  );

  useEffect(() => {
    threadRefs.current = threadRefs.current.slice(0, totalThreads);
  }, [totalThreads]);

  const handleThreadKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (!threadRefs.current.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % threadRefs.current.length;
      const nextButton = threadRefs.current[next];
      nextButton?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous =
        (index - 1 + threadRefs.current.length) % threadRefs.current.length;
      const previousButton = threadRefs.current[previous];
      previousButton?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      const firstButton = threadRefs.current[0];
      firstButton?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastButton = threadRefs.current[threadRefs.current.length - 1];
      lastButton?.focus();
    }
  };

  const handleAction = (appId: string, threadId: string, actionId: string) => {
    Promise.resolve(runAction(appId, threadId, actionId)).catch(() => {});
  };

  let threadIndex = -1;

  return (
    <section
      aria-label="Notification center"
      className="flex h-full flex-col bg-black/60 text-sm text-white"
    >
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
        <label htmlFor="notification-search" className="mb-1 block text-xs uppercase tracking-wide text-white/60">
          Search notifications
        </label>
        <input
          id="notification-search"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Filter by app, thread, or message"
          className="w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6" role="tree">
        {groups.length === 0 ? (
          <p className="text-center text-white/50" role="status">
            No notifications
          </p>
        ) : (
          <ol className="space-y-8" role="list">
            {groups.map(group => (
              <li key={group.appId}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    {group.appId}
                  </h3>
                  {group.unreadCount > 0 && (
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-200">
                      {group.unreadCount} unread
                    </span>
                  )}
                </div>
                <ol className="space-y-6" role="group">
                  {group.threads.map(displayThread => {
                    threadIndex += 1;
                    const currentIndex = threadIndex;
                    const thread = displayThread.thread;
                    const panelId = `${group.appId}-${thread.id}-panel`;
                    return (
                      <li key={thread.id} className="relative pl-6">
                        <span
                          aria-hidden
                          className="absolute left-0 top-3 block h-2 w-2 -translate-x-1/2 rounded-full bg-sky-400"
                        />
                        <span
                          aria-hidden
                          className="absolute left-0 top-5 bottom-0 w-px bg-white/10"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            ref={element => {
                              threadRefs.current[currentIndex] = element;
                            }}
                            className="flex-1 rounded border border-transparent bg-white/5 px-3 py-2 text-left transition hover:border-white/20 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                            aria-expanded={!thread.collapsed}
                            aria-controls={panelId}
                            onClick={() => toggleThreadCollapse(group.appId, thread.id)}
                            onKeyDown={event => handleThreadKeyDown(event, currentIndex)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-white">{thread.title}</p>
                                <p className="text-xs text-white/50">
                                  {formatTimestamp(thread.lastTimestamp)}
                                </p>
                              </div>
                              {thread.unreadCount > 0 && (
                                <span className="rounded-full bg-sky-500/30 px-2 py-0.5 text-xs font-semibold text-sky-100">
                                  {thread.unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                          {thread.actions.length > 0 && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              {thread.actions.map(action => (
                                <button
                                  key={action.id}
                                  type="button"
                                  className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:border-sky-400 hover:bg-sky-500/20 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                  onClick={() => handleAction(group.appId, thread.id, action.id)}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {!thread.collapsed && (
                          <div id={panelId} role="group" className="mt-3 space-y-3">
                            <ol className="space-y-2" role="list">
                              {displayThread.visibleNotifications
                                .slice()
                                .sort((a, b) => a.timestamp - b.timestamp)
                                .map(notification => (
                                  <li
                                    key={notification.id}
                                    className="rounded border border-white/10 bg-white/5 px-3 py-2"
                                  >
                                    <div className="flex items-baseline justify-between gap-3">
                                      <p className="text-white/90">{notification.message}</p>
                                      <time className="text-xs text-white/50" dateTime={new Date(notification.timestamp).toISOString()}>
                                        {formatTimestamp(notification.timestamp)}
                                      </time>
                                    </div>
                                  </li>
                                ))}
                            </ol>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

export default NotificationCenter;
