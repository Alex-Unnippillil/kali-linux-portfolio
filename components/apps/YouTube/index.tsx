import React, { useCallback, useEffect, useMemo, useState } from 'react';
import YouTubePlayer from '../../YouTubePlayer';

// Fetches a list of uploads for the given channel and renders them in a grid
// of iframes. A small mini-player is available for the active video and a
// watch queue is stored in localStorage so it persists between sessions.
// A search box filters videos on the client by their title.

type Video = { id: string; title: string };

const CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers channel

export default function YouTubeApp({ initialVideos = [] as Video[] }) {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<Video[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem('yt-queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('yt-queue', JSON.stringify(queue));
    } catch {
      /* ignore */
    }
  }, [queue]);

  // When no initial videos are supplied and an API key is available, fetch the
  // latest uploads for the channel. This keeps the component usable offline for
  // tests while still showing real data when running in the browser.
  useEffect(() => {
    if (!apiKey || initialVideos.length) return;
    (async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=25&order=date&type=video&key=${apiKey}`
        );
        const data = await res.json();
        const fetched: Video[] =
          data.items?.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
          })) || [];
        setVideos(fetched);
      } catch {
        // eslint-disable-next-line no-console
        console.error('Failed to load YouTube data');
      }
    })();
  }, [apiKey, initialVideos.length]);

  const filtered = useMemo(
    () =>
      videos.filter((v) =>
        (v.title || '').toLowerCase().includes(search.toLowerCase())
      ),
    [videos, search]
  );

  const current = queue[0] || null;

  const privacy = process.env.NEXT_PUBLIC_PRIVACY_MODE === 'true';
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const embedBase = `https://${privacy ? 'www.youtube-nocookie.com' : 'www.youtube.com'}`;

  const playVideo = useCallback((video: Video) => {
    setQueue((q) => {
      const without = q.filter((v) => v.id !== video.id);
      return [video, ...without];
    });
  }, []);

  const addToQueue = useCallback((video: Video) => {
    setQueue((q) => (q.some((v) => v.id === video.id) ? q : [...q, video]));
  }, []);

  const nextVideo = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-black px-3 py-2 rounded w-full max-w-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((video) => (
          <div key={video.id} className="relative pb-[56.25%]">
            <iframe
              src={`${embedBase}/embed/${video.id}?enablejsapi=1&origin=${encodeURIComponent(origin)}`}
              title={video.title}
              className="absolute inset-0 w-full h-full"
              sandbox="allow-same-origin allow-scripts allow-popups"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="no-referrer"
              allowFullScreen
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/60 text-xs">
              <button
                type="button"
                onClick={() => playVideo(video)}
                className="px-1 rounded hover:bg-black/40"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => addToQueue(video)}
                className="px-1 rounded hover:bg-black/40"
              >
                Queue
              </button>
            </div>
          </div>
        ))}
      </div>

      {current && (
        <div className="fixed bottom-3 right-3 w-72 bg-black text-white rounded shadow-lg z-50">
          <YouTubePlayer videoId={current.id} />
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <span className="truncate mr-2" title={current.title}>
              {current.title}
            </span>
            <button
              type="button"
              onClick={nextVideo}
              className="bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper used by the window manager in this portfolio project
export const displayYouTube = () => <YouTubeApp />;

