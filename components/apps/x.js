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
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const withPreview = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImages(withPreview);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('text', text.trim());
      images.forEach((img) => body.append('images', img.file));
      const res = await fetch('/api/x', {
        method: 'POST',
        body,
      });
      if (res.ok) {
        setText('');
        setImages([]);
        setTimelineKey((k) => k + 1);
        setOpen(false);
      }
    } catch (err) {
      // Silently fail for now
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col">
      <div className="p-2 flex justify-end border-b border-gray-600">
        <button
          type="button"
          className="x-button-primary"
          onClick={() => setOpen(true)}
        >
          Compose
        </button>
      </div>
      <div className="flex-1">
        <TwitterTimelineEmbed
          key={timelineKey}
          sourceType="profile"
          screenName="AUnnippillil"
          options={{ chrome: 'noheader noborders' }}
          className="w-full h-full"
        />
      </div>
      {open && (
        <div className="x-modal-overlay" role="dialog" aria-modal="true">
          <form onSubmit={handleSubmit} className="x-modal flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's happening?"
              className="p-2 rounded bg-gray-800 text-white"
            />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <img
                  key={img.url}
                  src={img.url}
                  alt="preview"
                  className="x-image-preview"
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="x-button-secondary"
                onClick={() => {
                  setOpen(false);
                  setImages([]);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="x-button-primary disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export const displayX = () => <XApp />;

