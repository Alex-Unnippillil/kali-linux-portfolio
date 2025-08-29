'use client';

import { useRef } from 'react';
import { toPng } from 'html-to-image';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';

const isStringArray = (val: unknown): val is string[] =>
  Array.isArray(val) && val.every((v) => typeof v === 'string');

export default function ThreadComposer() {
  const { accent } = useSettings();
  const [tweets, setTweets] = usePersistentState<string[]>(
    'x-thread-draft',
    () => [''],
    isStringArray
  );
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateTweet = (index: number, value: string) => {
    setTweets((ts) => {
      const next = [...ts];
      next[index] = value;
      return next;
    });
  };

  const addTweet = () => setTweets((ts) => [...ts, '']);

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

  return (
    <div className="space-y-4 p-4">
      {tweets.map((tweet, i) => (
        <div key={i} className="space-y-2">
          <textarea
            value={tweet}
            onChange={(e) => updateTweet(i, e.target.value)}
            placeholder={`Tweet ${i + 1}`}
            maxLength={280}
            className="w-full p-2 border rounded bg-transparent"
          />
          <div
            ref={(el) => (previewRefs.current[i] = el)}
            className="p-2 border rounded whitespace-pre-wrap bg-white text-black dark:bg-black dark:text-white"
          >
            {tweet || <span className="text-gray-400">Preview...</span>}
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
      </div>
    </div>
  );
}

