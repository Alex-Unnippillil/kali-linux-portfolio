import React, { useState, useEffect, useRef, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

const RESULTS_PER_PAGE = 12;

// Lightweight YouTube search client that works during static export.
// All requests are made from the browser using the YouTube Data API v3.
// Videos can also be injected via the `initialVideos` prop (used in tests).
export default function YouTubeApp({ initialVideos = [] }) {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [videos, setVideos] = useState(initialVideos);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Persisted queue of upcoming videos
  const [queue, setQueue] = usePersistentState('youtube-queue', []);

  // Toggle to open videos on youtube-nocookie.com
  const [noCookie, setNoCookie] = usePersistentState('youtube-no-cookie', false);

  const sentinelRef = useRef(null);

  // Debounce search input to limit API calls
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(id);
  }, [query]);

  const formatItems = useCallback((items = []) =>
    items.map((item) => {
      const id = item.id.videoId || item.id;
      const snippet = item.snippet || {};
      return {
        id,
        title: snippet.title,
        publishedAt: snippet.publishedAt,
        thumbnail: snippet.thumbnails?.medium?.url,
      };
    }),
  []);

  const fetchResults = useCallback(
    async (pageToken) => {
      if (!apiKey || !debouncedQuery) return;
      setLoading(true);
      try {
        const token = pageToken ? `&pageToken=${pageToken}` : '';
        const searchUrl =
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${RESULTS_PER_PAGE}` +
          `&q=${encodeURIComponent(debouncedQuery)}&key=${apiKey}${token}`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        setVideos((prev) =>
          pageToken ? [...prev, ...formatItems(data.items)] : formatItems(data.items),
        );
        setNextPage(data.nextPageToken || null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch YouTube data', err);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, debouncedQuery, formatItems],
  );

  // Fetch when the debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      fetchResults();
    } else {
      setVideos(initialVideos);
      setNextPage(null);
    }
  }, [debouncedQuery, fetchResults, initialVideos]);

  // Infinite scroll sentinel
  const handleIntersect = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && nextPage && !loading) {
        fetchResults(nextPage);
      }
    },
    [nextPage, loading, fetchResults],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(handleIntersect);
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const addToQueue = useCallback(
    (video) => setQueue((q) => [...q, video]),
    [setQueue],
  );

  const videoUrl = useCallback(
    (id) =>
      noCookie
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : `https://www.youtube.com/watch?v=${id}`,
    [noCookie],
  );

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-3">
      {!apiKey && videos.length === 0 ? (
        <p>YouTube API key is not configured.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              placeholder="Search"
              className="flex-1 min-w-[150px] text-black px-3 py-2 rounded"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={noCookie}
                onChange={(e) => setNoCookie(e.target.checked)}
              />
              no-cookie
            </label>
          </div>

          {queue.length > 0 && (
            <div className="mb-3">
              <h2 className="font-bold mb-1 text-sm">Queue</h2>
              <ul className="flex flex-col gap-1 text-sm" data-testid="queue-list">
                {queue.map((v) => (
                  <li key={v.id}>{v.title}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                data-testid="video-card"
                className="bg-gray-800 rounded-lg overflow-hidden shadow flex flex-col"
              >
                <a
                  href={videoUrl(video.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="w-full" />
                  )}
                  <div
                    className="p-2 font-semibold text-sm"
                    title={video.title}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {video.title}
                  </div>
                </a>
                <div className="px-2 pb-2 text-xs text-gray-300">
                  {video.publishedAt
                    ? new Date(video.publishedAt).toLocaleDateString()
                    : ''}
                </div>
                <button
                  className="mx-2 mb-2 text-xs bg-red-600 hover:bg-red-500 text-white rounded px-2 py-1"
                  onClick={() => addToQueue(video)}
                >
                  Add to Queue
                </button>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} />
          {loading && <p className="mt-2 text-center text-sm">Loading...</p>}
        </>
      )}
    </div>
  );
}

// Wrapper used by the window manager in this portfolio project.
export const displayYouTube = () => <YouTubeApp />;

