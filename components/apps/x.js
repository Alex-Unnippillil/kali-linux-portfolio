import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

// Load the Twitter embed only on the client to avoid SSR issues.
const TwitterTimelineEmbed = dynamic(
  () => import('react-twitter-embed').then((mod) => mod.TwitterTimelineEmbed),
  { ssr: false }
);

export default function XApp() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  const [mode, setMode] = useState('profile');
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState([]);
  const [current, setCurrent] = useState({ type: 'profile', value: 'AUnnippillil' });
  const [mediaOnly, setMediaOnly] = useState(false);
  const [dense, setDense] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('x-saved') || '[]');
      if (Array.isArray(stored)) setSaved(stored);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('x-saved', JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    setTimelineKey((k) => k + 1);
  }, [current, mediaOnly, dense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        setText('');
        setTimelineKey((k) => k + 1);
      }
    } catch (err) {
      // Silently fail for now
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoad = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const item = { type: mode, value: input.trim() };
    setCurrent(item);
    setInput('');
    if (!saved.some((s) => s.type === item.type && s.value === item.value)) {
      setSaved((s) => [...s, item]);
    }
  };

  const selectSaved = (idx) => {
    const item = saved[idx];
    if (item) setCurrent(item);
  };

  let timelineProps = {};
  if (current.type === 'profile') {
    if (mediaOnly) {
      timelineProps = {
        sourceType: 'url',
        url: `https://twitter.com/${current.value}/media`,
      };
    } else {
      timelineProps = { sourceType: 'profile', screenName: current.value };
    }
  } else if (current.type === 'list') {
    const [owner, slug] = current.value.split('/');
    if (owner && slug) {
      if (mediaOnly) {
        timelineProps = {
          sourceType: 'url',
          url: `https://twitter.com/${owner}/lists/${slug}/media`,
        };
      } else {
        timelineProps = { sourceType: 'list', ownerScreenName: owner, slug };
      }
    }
  } else if (current.type === 'search') {
    let q = current.value;
    if (mediaOnly) q += ' filter:media';
    timelineProps = {
      sourceType: 'url',
      url: `https://twitter.com/search?q=${encodeURIComponent(q)}`,
    };
  }

  const options = {
    chrome: 'noheader noborders',
    tweetLimit: dense ? 20 : undefined,
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col">
      <form
        onSubmit={handleSubmit}
        className="p-2 flex flex-col gap-2 border-b border-gray-600"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="self-end px-4 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </form>
      <div className="p-2 flex flex-col gap-2 border-b border-gray-600">
        <form onSubmit={handleLoad} className="flex gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-gray-800 text-white rounded p-1"
          >
            <option value="profile">Profile</option>
            <option value="list">List</option>
            <option value="search">Search</option>
          </select>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'profile' ? 'handle' : mode === 'list' ? 'owner/slug' : 'query'}
            className="flex-1 p-1 rounded bg-gray-800 text-white"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-blue-500 text-white rounded"
          >
            Load
          </button>
        </form>
        {saved.length > 0 && (
          <select
            onChange={(e) => selectSaved(e.target.value)}
            className="bg-gray-800 text-white rounded p-1"
            value={saved.findIndex(
              (s) => s.type === current.type && s.value === current.value
            )}
          >
            {saved.map((s, i) => (
              <option key={`${s.type}-${s.value}`} value={i}>
                {s.type}: {s.value}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-4">
          <label className="flex items-center gap-1 text-white">
            <input
              type="checkbox"
              checked={mediaOnly}
              onChange={(e) => setMediaOnly(e.target.checked)}
            />
            Media only
          </label>
          <label className="flex items-center gap-1 text-white">
            <input
              type="checkbox"
              checked={dense}
              onChange={(e) => setDense(e.target.checked)}
            />
            Dense
          </label>
        </div>
      </div>
      <div className="flex-1">
        <TwitterTimelineEmbed
          key={timelineKey}
          {...timelineProps}
          options={options}
          className="w-full h-full"
        />
      </div>

    </div>
  );
}

export const displayX = () => <XApp />;

