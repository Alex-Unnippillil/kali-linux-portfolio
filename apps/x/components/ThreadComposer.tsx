'use client';

import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { toPng } from 'html-to-image';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';
import type { ScheduledTweet } from '../state/scheduled';
import useSavedTweets from '../state/savedTweets';
import { sanitizeHandle, sanitizeTweetText } from '../utils';

interface TweetDraft {
  text: string;
  timestamp: string;
}

const isTweetArray = (val: unknown): val is TweetDraft[] =>
  Array.isArray(val) &&
  val.every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as any).text === 'string' &&
      typeof (v as any).timestamp === 'string',
  );

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
  const [, setSavedTweets] = useSavedTweets();
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);
  const workerRef = useRef<Worker | null>(null);

  const persistSavedTweet = (tweet: ScheduledTweet) => {
    const text = sanitizeTweetText(DOMPurify.sanitize(tweet.text));
    const author = sanitizeHandle('ThreadDraft') || 'ThreadDraft';
    if (!text || !Number.isFinite(tweet.time)) return;
    setSavedTweets((prev) => {
      const filtered = prev.filter((t) => t.id !== tweet.id);
      return [
        ...filtered,
        { id: tweet.id, text, author, timestamp: tweet.time },
      ].sort((a, b) => b.timestamp - a.timestamp);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker(
      new URL('../../../workers/postPublisher.ts', import.meta.url),
    );
    worker.onmessage = ({ data }) => {
      if (data.action === 'publish') {
        const tweet = data.tweet as ScheduledTweet;
        setScheduled((prev) => prev.filter((t) => t.id !== tweet.id));
        setPublished((prev) => [...prev, tweet]);
        persistSavedTweet(tweet);
      }
    };
    worker.postMessage({ action: 'setQueue', tweets: scheduled });
    workerRef.current = worker;
    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage({ action: 'setQueue', tweets: scheduled });
  }, [scheduled]);

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
      .map((t, i) => ({
        id: `${Date.now()}-${i}`,
        text: sanitizeTweetText(DOMPurify.sanitize(t.text)),
        time: new Date(t.timestamp).getTime(),
      }))
      .filter((t) => t.text && Number.isFinite(t.time));
    if (newTweets.length === 0) return;
    setScheduled((prev) => [...prev, ...newTweets]);
    newTweets.forEach(persistSavedTweet);
    setTweets([{ text: '', timestamp: '' }]);
    previewRefs.current = [];
  };

  return (
    <div className="space-y-4 p-4">
      {tweets.map((tweet, i) => (
        <div key={i} className="space-y-2">
          <textarea
            value={tweet.text}
            onChange={(e) => updateTweet(i, e.target.value)}
            placeholder={`Tweet ${i + 1}`}
            maxLength={280}
            className="w-full p-2 border rounded bg-transparent"
          />
          <input
            type="datetime-local"
            value={tweet.timestamp}
            onChange={(e) => updateTime(i, e.target.value)}
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
    </div>
  );
}

