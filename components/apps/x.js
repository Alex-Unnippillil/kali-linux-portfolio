import React, { useEffect, useRef, useState } from 'react';

const MAX_CHARS = 280;
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function XApp() {
  const theme = 'dark';
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [media, setMedia] = useState([]);
  const [status, setStatus] = useState('');
  const [strokeOffset, setStrokeOffset] = useState(CIRCUMFERENCE);
  const fileInputRef = useRef(null);
  const timelineRef = useRef(null);
  const panelRef = useRef(null);
  const [shouldLoadTimeline, setShouldLoadTimeline] = useState(false);

  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [savedHashtags, setSavedHashtags] = useState([]);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [useLocalFeed, setUseLocalFeed] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const targetOffset =
      CIRCUMFERENCE - (Math.min(text.length, MAX_CHARS) / MAX_CHARS) * CIRCUMFERENCE;
    if (prefersReducedMotion) {
      setStrokeOffset(targetOffset);
      return;
    }
    let frame;
    const animate = () => {
      setStrokeOffset(targetOffset);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [text, prefersReducedMotion]);

  const handleMedia = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setMedia((m) => [...m, ...mapped]);
  };

  const removeMedia = (url) => {
    setMedia((m) => {
      const updated = m.filter((item) => item.url !== url);
      URL.revokeObjectURL(url);
      return updated;
    });
  };

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
        setMedia([]);
        setTimelineKey((k) => k + 1);
        setStatus('Post submitted');
      }
    } catch (err) {
      setStatus('Post failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldLoadTimeline(true);
        observer.disconnect();
      }
    });
    if (panelRef.current) observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadTimeline) return;
    const src = 'https://platform.twitter.com/widgets.js';
    let script = document.querySelector(`script[src="${src}"]`);
    let timeout;
    const handleError = () => {
      clearTimeout(timeout);
      setScriptError(true);
    };
    const loadTimeline = () => {
      clearTimeout(timeout);
      if (!timelineRef.current || !window.twttr) return;
      setScriptError(false);
      timelineRef.current.innerHTML = '';
      setTimelineLoaded(false);
      window.twttr.widgets
        .createTimeline(
          { sourceType: 'profile', screenName: 'AUnnippillil' },
          timelineRef.current,
          { chrome: 'noheader noborders', theme }
        )
        .then(() => setTimelineLoaded(true))
        .catch(() => setScriptError(true));
    };
    if (script && window.twttr) {
      loadTimeline();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      }
      timeout = window.setTimeout(handleError, 10000);
      script.addEventListener('load', loadTimeline, { once: true });
      script.addEventListener('error', handleError, { once: true });
    }
    return () => {
      clearTimeout(timeout);
      script && script.removeEventListener('error', handleError);
    };
  }, [timelineKey, shouldLoadTimeline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tags = JSON.parse(localStorage.getItem('xSavedHashtags') || '[]');
    const profiles = JSON.parse(localStorage.getItem('xSavedProfiles') || '[]');
    setSavedHashtags(tags);
    setSavedProfiles(profiles);
    if (!navigator.onLine) {
      setUseLocalFeed(true);
    }
  }, []);

  useEffect(() => {
    if (useLocalFeed && feed.length === 0) {
      (async () => {
        setLoadingFeed(true);
        try {
          const res = await fetch('/x-feed.json');
          const data = await res.json();
          setFeed(data);
        } catch (err) {
          // ignore
        } finally {
          setLoadingFeed(false);
        }
      })();
    }
  }, [useLocalFeed, feed.length]);

  const persistTags = (tags) =>
    typeof window !== 'undefined' &&
    localStorage.setItem('xSavedHashtags', JSON.stringify(tags));
  const persistProfiles = (profiles) =>
    typeof window !== 'undefined' &&
    localStorage.setItem('xSavedProfiles', JSON.stringify(profiles));

  const addSavedHashtag = (tag) => {
    setSavedHashtags((prev) => {
      if (prev.includes(tag)) return prev;
      const updated = [...prev, tag];
      persistTags(updated);
      return updated;
    });
  };

  const addSavedProfile = (handle) => {
    setSavedProfiles((prev) => {
      if (prev.includes(handle)) return prev;
      const updated = [...prev, handle];
      persistProfiles(updated);
      return updated;
    });
  };

  const availableHashtags = Array.from(
    new Set(feed.flatMap((p) => p.hashtags || []))
  );
  const filteredFeed = filterTag
    ? feed.filter((p) => p.hashtags.includes(filterTag))
    : feed;

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col tweet-container">
      <form
        onSubmit={handleSubmit}
        className="p-2 flex flex-col gap-2 border-b border-gray-600 bg-gray-900 text-gray-100 tweet-form"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          maxLength={MAX_CHARS}
          className="w-full p-2 rounded bg-gray-800 text-gray-100 placeholder-gray-400"
          style={{ maxInlineSize: '60ch' }}
        />

        {media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <div key={m.url} className="relative">
                <img
                  src={m.url}
                  alt={m.file.name}
                  className="max-h-32 rounded object-cover media-image"
                />
                <button
                  type="button"
                  aria-label="Remove media"
                  onClick={() => removeMedia(m.url)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              className="cursor-pointer text-blue-300 hover:text-blue-200"
              aria-label="Add media"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleMedia}
              />
              📎
            </label>
          </div>
          <div className="flex items-center gap-2">
            <svg
              width="40"
              height="40"
              role="img"
              aria-label={`${text.length} of ${MAX_CHARS} characters used`}
            >
              <circle
                r={RADIUS}
                cx="20"
                cy="20"
                stroke="#4b5563"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                r={RADIUS}
                cx="20"
                cy="20"
                stroke="#3b82f6"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <button
              type="submit"
              disabled={
                submitting || !text.trim() || text.length > MAX_CHARS
              }
              className="px-4 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
        <div aria-live="polite" className="sr-only">
          {status}
        </div>
      </form>
      {savedHashtags.length > 0 && (
        <section className="p-2">
          <h2 className="text-sm mb-2">Saved Hashtags</h2>
          <div className="grid grid-cols-2 gap-2">
            {savedHashtags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className="p-2 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>
      )}
      {savedProfiles.length > 0 && (
        <section className="p-2">
          <h2 className="text-sm mb-2">Saved Profiles</h2>
          <div className="grid grid-cols-2 gap-2">
            {savedProfiles.map((handle) => (
              <button
                key={handle}
                onClick={() =>
                  window.open(`https://x.com/${handle}`, '_blank')
                }
                className="p-2 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              >
                @{handle}
              </button>
            ))}
          </div>
        </section>
      )}
      {useLocalFeed ? (
        <div className="flex-1 overflow-auto">
          {availableHashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2">
              {availableHashtags.map((tag) => (
                <div key={tag} className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
                    className={`px-2 py-1 rounded-full text-sm ${
                      filterTag === tag
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    #{tag}
                  </button>
                  <button
                    aria-label={`Save ${tag}`}
                    onClick={() => addSavedHashtag(tag)}
                    className="text-yellow-400"
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          )}
          {loadingFeed ? (
            <ul className="p-4 space-y-4" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="flex gap-4 border-b border-gray-700 pb-4 last:border-b-0"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-700 motion-safe:animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4 motion-safe:animate-pulse" />
                    <div className="h-4 bg-gray-700 rounded w-1/2 motion-safe:animate-pulse" />
                    <div className="h-4 bg-gray-700 rounded w-full motion-safe:animate-pulse" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="p-4 space-y-4">
              {filteredFeed.map((post) => (
                <li
                  key={post.id}
                  className="border-b border-gray-700 pb-4 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{post.user.name}</span>
                    <span className="text-gray-400">@{post.user.handle}</span>
                    <button
                      onClick={() => addSavedProfile(post.user.handle)}
                      className="ml-auto text-yellow-400"
                      aria-label={`Save profile ${post.user.handle}`}
                    >
                      ★
                    </button>
                  </div>
                  <p className="mb-2">{post.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <div key={tag} className="flex items-center gap-1">
                        <button
                          onClick={() => setFilterTag(tag)}
                          className="px-2 py-0.5 bg-gray-700 rounded-full text-sm"
                        >
                          #{tag}
                        </button>
                        <button
                          aria-label={`Save ${tag}`}
                          onClick={() => addSavedHashtag(tag)}
                          className="text-yellow-400"
                        >
                          ★
                        </button>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div ref={panelRef} className="flex-1 relative">
          {!timelineLoaded && !scriptError && (
            <ul className="p-4 space-y-4 tweet-feed" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="flex gap-4 border-b border-gray-700 pb-4 last:border-b-0"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-700 motion-safe:animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4 motion-safe:animate-pulse" />
                    <div className="h-4 bg-gray-700 rounded w-1/2 motion-safe:animate-pulse" />
                    <div className="h-4 bg-gray-700 rounded w-full motion-safe:animate-pulse" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div
            ref={timelineRef}
            className={`${timelineLoaded ? 'block h-full' : 'hidden'} tweet-feed`}
          />
          {(scriptError ||
            (typeof navigator !== 'undefined' && !navigator.onLine)) && (
            <div className="p-4 text-center">
              <button
                onClick={() => setUseLocalFeed(true)}
                className="underline text-blue-500"
              >
                Load local feed
              </button>
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .tweet-container {
          container-type: inline-size;
        }
        .tweet-feed {
          max-inline-size: 60ch;
          margin-inline: auto;
          width: 100%;
        }
        @container (max-width: 480px) {
          .tweet-form {
            padding: 0.25rem;
          }
          .media-image {
            max-height: 4rem;
            object-fit: contain;
          }
          .tweet-feed iframe,
          .tweet-feed img {
            width: 100%;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}

export const displayX = () => <XApp />;

