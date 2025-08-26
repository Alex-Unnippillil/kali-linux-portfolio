import React, { useState } from 'react';

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
      <div className="flex-1">
        <TwitterTimelineEmbed
          key={timelineKey}
          sourceType="profile"
          screenName="AUnnippillil"
          options={{ chrome: 'noheader noborders' }}
          className="w-full h-full"
        />
      </div>

    </div>
  );
}

export const displayX = () => <XApp />;

