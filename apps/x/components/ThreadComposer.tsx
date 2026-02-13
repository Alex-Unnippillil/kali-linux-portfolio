'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';
import tabCoordinator, {
  type JobHandle,
  type ProgressMeta,
  type TabCoordinatorState,
} from '../../../utils/tabCoordinator';
import type { ScheduledTweet } from '../state/scheduled';

interface TweetDraft {
  text: string;
  timestamp: string;
}

type PostPublisherCommand = {
  type: 'sync';
  scheduled: ScheduledTweet[];
  published: ScheduledTweet[];
};

type PostPublisherProgress = {
  scheduled: ScheduledTweet[];
  published: ScheduledTweet[];
  nextPublish: number | null;
  event?: 'publish' | 'sync' | 'queue';
  tweet?: ScheduledTweet;
};

const isTweetArray = (val: unknown): val is TweetDraft[] =>
  Array.isArray(val) &&
  val.every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as any).text === 'string' &&
      typeof (v as any).timestamp === 'string',
  );

const areTweetsEqual = (a: ScheduledTweet[], b: ScheduledTweet[]) =>
  a.length === b.length &&
  a.every((tweet, index) => {
    const other = b[index];
    return (
      !!other &&
      tweet.id === other.id &&
      tweet.time === other.time &&
      tweet.text === other.text
    );
  });

const computeNextPublish = (list: ScheduledTweet[]) =>
  list.length > 0 ? Math.min(...list.map((t) => t.time)) : null;

const formatElapsed = (timestamp: number | null) => {
  if (!timestamp) return '—';
  const diff = Date.now() - timestamp;
  const abs = Math.abs(diff);
  if (abs < 1000) return diff >= 0 ? 'just now' : 'in 1s';
  if (abs < 60_000) {
    const seconds = Math.round(abs / 1000);
    return diff >= 0 ? `${seconds}s ago` : `in ${seconds}s`;
  }
  if (abs < 3_600_000) {
    const minutes = Math.round(abs / 60_000);
    return diff >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  }
  const hours = Math.round(abs / 3_600_000);
  return diff >= 0 ? `${hours}h ago` : `in ${hours}h`;
};

const formatNextPublish = (timestamp: number | null) => {
  if (!timestamp) return '—';
  const diff = timestamp - Date.now();
  const abs = Math.abs(diff);
  if (abs < 1000) return diff >= 0 ? 'in 1s' : 'just now';
  if (abs < 60_000) return `${diff >= 0 ? 'in' : ''} ${Math.round(abs / 1000)}s${diff < 0 ? ' ago' : ''}`.trim();
  if (abs < 3_600_000)
    return `${diff >= 0 ? 'in' : ''} ${Math.round(abs / 60_000)}m${diff < 0 ? ' ago' : ''}`.trim();
  return `${diff >= 0 ? 'in' : ''} ${Math.round(abs / 3_600_000)}h${diff < 0 ? ' ago' : ''}`.trim();
};

const formatDebugData = (data?: Record<string, unknown>) => {
  if (!data) return '';
  try {
    const json = JSON.stringify(data);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  } catch {
    return '';
  }
};

export default function ThreadComposer() {
  const { accent } = useSettings();
  const [tweets, setTweets] = usePersistentState<TweetDraft[]>(
    'x-thread-draft',
    () => [{ text: '', timestamp: '' }],
    isTweetArray,
  );
  const [scheduled, setScheduled] = usePersistentState<ScheduledTweet[]>(
    'x-thread-scheduled',
    [],
  );
  const [published, setPublished] = usePersistentState<ScheduledTweet[]>(
    'x-thread-published',
    [],
  );

  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const coordinatorHandleRef = useRef<
    JobHandle<PostPublisherCommand, PostPublisherProgress> | null
  >(null);
  const leaderSendProgressRef = useRef<
    (progress: PostPublisherProgress) => void
  >(() => {});
  const scheduledRef = useRef<ScheduledTweet[]>(scheduled);
  const publishedRef = useRef<ScheduledTweet[]>(published);

  const [coordState, setCoordState] = useState<TabCoordinatorState>(
    tabCoordinator.getState(),
  );
  const [debugLog, setDebugLog] = useState(tabCoordinator.getDebugLog());
  const [lastProgress, setLastProgress] = useState<PostPublisherProgress | null>(
    null,
  );
  const [lastProgressMeta, setLastProgressMeta] = useState<ProgressMeta | null>(
    null,
  );
  const [lastLocalUpdate, setLastLocalUpdate] = useState<number | null>(null);

  useEffect(() => tabCoordinator.subscribe(setCoordState), []);
  useEffect(() => tabCoordinator.subscribeDebug(setDebugLog), []);

  useEffect(() => {
    scheduledRef.current = scheduled;
  }, [scheduled]);
  useEffect(() => {
    publishedRef.current = published;
  }, [published]);

  const applyState = useCallback(
    (
      nextScheduled: ScheduledTweet[],
      nextPublished: ScheduledTweet[],
      options: {
        broadcast?: boolean;
        event?: PostPublisherProgress['event'];
        tweet?: ScheduledTweet;
      } = {},
    ) => {
      const changedScheduled = !areTweetsEqual(
        scheduledRef.current,
        nextScheduled,
      );
      const changedPublished = !areTweetsEqual(
        publishedRef.current,
        nextPublished,
      );

      if (!changedScheduled && !changedPublished) return;

      scheduledRef.current = nextScheduled;
      publishedRef.current = nextPublished;
      setScheduled(nextScheduled);
      setPublished(nextPublished);

      if (changedScheduled && coordinatorHandleRef.current?.isLeader()) {
        workerRef.current?.postMessage({
          action: 'setQueue',
          tweets: nextScheduled,
        });
      }

      if (options.broadcast !== false) {
        const payload: PostPublisherProgress = {
          scheduled: nextScheduled,
          published: nextPublished,
          nextPublish: computeNextPublish(nextScheduled),
          event: options.event,
          tweet: options.tweet,
        };
        const handle = coordinatorHandleRef.current;
        if (handle?.isLeader()) {
          leaderSendProgressRef.current(payload);
        } else {
          handle?.sendCommand({
            type: 'sync',
            scheduled: nextScheduled,
            published: nextPublished,
          });
        }
        setLastLocalUpdate(Date.now());
      }
    },
    [setScheduled, setPublished],
  );

  useEffect(() => {
    const handle = tabCoordinator.registerJob<
      PostPublisherProgress,
      PostPublisherCommand
    >('post-publisher', {
      debugLabel: 'Post Publisher',
      onLeaderStart: ({ sendProgress }) => {
        leaderSendProgressRef.current = (progress) => sendProgress(progress);
        if (typeof window === 'undefined') return () => {};

        const worker = new Worker(
          new URL('../../../workers/postPublisher.ts', import.meta.url),
        );
        workerRef.current = worker;
        worker.onmessage = ({ data }) => {
          if (data.action === 'publish') {
            const tweet = data.tweet as ScheduledTweet;
            const nextScheduled = scheduledRef.current.filter(
              (t) => t.id !== tweet.id,
            );
            const nextPublished = [...publishedRef.current, tweet];
            applyState(nextScheduled, nextPublished, {
              event: 'publish',
              tweet,
            });
          }
        };
        worker.postMessage({
          action: 'setQueue',
          tweets: scheduledRef.current,
        });
        sendProgress({
          scheduled: scheduledRef.current,
          published: publishedRef.current,
          nextPublish: computeNextPublish(scheduledRef.current),
          event: 'sync',
        });
        return () => {
          workerRef.current?.terminate();
          workerRef.current = null;
          leaderSendProgressRef.current = () => {};
        };
      },
      onLeaderStop: () => {
        workerRef.current?.terminate();
        workerRef.current = null;
        leaderSendProgressRef.current = () => {};
      },
      onCommand: (command) => {
        if (command.type === 'sync') {
          applyState(command.scheduled, command.published, { event: 'sync' });
          workerRef.current?.postMessage({
            action: 'setQueue',
            tweets: command.scheduled,
          });
        }
      },
      onProgress: (progress, meta) => {
        setLastProgress(progress);
        setLastProgressMeta(meta);
        if (meta.originId === tabCoordinator.tabId) return;
        applyState(progress.scheduled, progress.published, { broadcast: false });
      },
    });

    coordinatorHandleRef.current = handle;
    return () => {
      handle.dispose();
      coordinatorHandleRef.current = null;
    };
  }, [applyState]);

  const updateTweet = (index: number, value: string) => {
    setTweets((ts) => {
      const next = [...ts];
      next[index] = { ...next[index], text: value };
      return next;
    });
  };

  const updateTime = (index: number, value: string) => {
    setTweets((ts) => {
      const next = [...ts];
      next[index] = { ...next[index], timestamp: value };
      return next;
    });
  };

  const addTweet = () => setTweets((ts) => [...ts, { text: '', timestamp: '' }]);

  const removeTweet = (index: number) => {
    setTweets((ts) => ts.filter((_, i) => i !== index));
    previewRefs.current.splice(index, 1);
  };

  const exportThread = () => {
    previewRefs.current.forEach((node, i) => {
      if (!node) return;
      toPng(node)
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `tweet-${i + 1}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch(() => {
          // ignore errors
        });
    });
  };

  const queueTweets = () => {
    const newTweets = tweets
      .filter((t) => t.text.trim() && t.timestamp)
      .map((t, i) => ({
        id: `${Date.now()}-${i}`,
        text: t.text.trim(),
        time: new Date(t.timestamp).getTime(),
      }));
    if (newTweets.length === 0) return;
    const nextScheduled = [...scheduledRef.current, ...newTweets];
    applyState(nextScheduled, publishedRef.current, { event: 'queue' });
    setTweets([{ text: '', timestamp: '' }]);
    previewRefs.current = [];
  };

  const nextPublish = useMemo(
    () => computeNextPublish(scheduled),
    [scheduled],
  );
  const debugEntries = useMemo(
    () => debugLog.slice(-10).reverse(),
    [debugLog],
  );

  return (
    <div className="space-y-4 p-4">
      {tweets.map((tweet, i) => (
        <div key={i} className="space-y-2">
          <textarea
            value={tweet.text}
            onChange={(e) => updateTweet(i, e.target.value)}
            placeholder={`Tweet ${i + 1}`}
            aria-label={`Tweet ${i + 1} text`}
            maxLength={280}
            className="w-full p-2 border rounded bg-transparent"
          />
          <input
            type="datetime-local"
            value={tweet.timestamp}
            onChange={(e) => updateTime(i, e.target.value)}
            aria-label={`Tweet ${i + 1} scheduled time`}
            className="w-full p-2 border rounded bg-transparent"
          />
          <div
            ref={(el) => {
              previewRefs.current[i] = el;
            }}
            className="p-2 border rounded whitespace-pre-wrap bg-white text-black dark:bg-black dark:text-white"
          >
            {tweet.text || <span className="text-gray-400">Preview...</span>}
          </div>
          {tweets.length > 1 && (
            <button
              type="button"
              onClick={() => removeTweet(i)}
              className="text-sm text-red-500"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addTweet}
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: accent }}
        >
          Add Tweet
        </button>
        <button
          type="button"
          onClick={exportThread}
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: accent }}
        >
          Export Thread
        </button>
        <button
          type="button"
          onClick={queueTweets}
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: accent }}
        >
          Queue Posts
        </button>
      </div>
      {scheduled.length > 0 && (
        <div>
          <h3 className="font-semibold">Scheduled Posts</h3>
          <ul className="space-y-1">
            {scheduled.map((t) => (
              <li key={t.id} className="text-sm">
                {new Date(t.time).toLocaleString()} - {t.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {published.length > 0 && (
        <div>
          <h3 className="font-semibold">Published Posts</h3>
          <ul className="space-y-1">
            {published.map((t) => (
              <li key={t.id} className="text-sm">
                {new Date(t.time).toLocaleString()} - {t.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-1 rounded border border-gray-700 bg-black/50 p-3 text-xs text-gray-200">
        <div className="font-semibold text-white">Tab coordination</div>
        <div>
          Role:{' '}
          <span className={coordState.isLeader ? 'text-green-400' : 'text-yellow-300'}>
            {coordState.isLeader ? 'Leader' : 'Follower'}
          </span>
        </div>
        <div>
          Tab ID: <code>{coordState.tabId.slice(0, 8)}</code>
        </div>
        <div>Leader: {coordState.leaderId ?? '—'}</div>
        <div>
          Leader since:{' '}
          {coordState.leaderSince
            ? new Date(coordState.leaderSince).toLocaleTimeString()
            : '—'}
        </div>
        <div>Last heartbeat: {formatElapsed(coordState.lastHeartbeat)}</div>
        <div>Scheduled posts: {scheduled.length}</div>
        <div>
          Next publish:{' '}
          {nextPublish
            ? `${new Date(nextPublish).toLocaleTimeString()} (${formatNextPublish(nextPublish)})`
            : '—'}
        </div>
        {lastLocalUpdate && (
          <div>Local change: {formatElapsed(lastLocalUpdate)}</div>
        )}
        {lastProgressMeta && (
          <div>
            Last update ({
              new Date(lastProgressMeta.timestamp).toLocaleTimeString()
            }
            ) by{' '}
            {lastProgressMeta.originId === coordState.tabId
              ? 'this tab'
              : lastProgressMeta.originId.slice(0, 8)}
            : {lastProgress?.event ?? 'sync'}
          </div>
        )}
        <details className="pt-1">
          <summary className="cursor-pointer text-white">Debug log</summary>
          <ul className="mt-1 max-h-28 overflow-auto space-y-1 text-[10px] text-gray-300">
            {debugEntries.map((entry) => (
              <li key={entry.id}>
                {new Date(entry.timestamp).toLocaleTimeString()} · {entry.message}
                {entry.data ? ` — ${formatDebugData(entry.data)}` : ''}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
