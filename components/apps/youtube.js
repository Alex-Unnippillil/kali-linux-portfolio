import React, { useEffect, useMemo, useState } from 'react';

const CHANNEL_HANDLE = 'Alex-Unnippillil';

// Renders a small YouTube browser similar to the YouTube mobile UI.
// Videos can be fetched from the real API if an API key is provided or
// injected via the `initialVideos` prop (used in tests).
export default function YouTubeApp({ initialVideos = [] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [playlists, setPlaylists] = useState([]); // [{id,title}]
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortKey, setSortKey] = useState('date'); // 'date' | 'title' | 'playlist'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // Fetch videos from YouTube when an API key is available and no initial
  // videos are supplied. This mirrors the behaviour of the original app but
  // keeps the logic concise.
  useEffect(() => {
    if (!apiKey || initialVideos.length) return;

    async function fetchData() {
      setLoading(true);
      try {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${CHANNEL_HANDLE}&key=${apiKey}`
        );
        const channelData = await channelRes.json();
        const channelId = channelData.items?.[0]?.id;
        if (!channelId) return;

        const playlistsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=50&key=${apiKey}`
        );
        const playlistsData = await playlistsRes.json();
        const list =
          playlistsData.items?.map((p) => ({
            id: p.id,
            title: p.snippet.title,
          })) || [];

        // Include the automatically generated "Liked videos" playlist
        const favoritesId = `LL${channelId}`;
        list.push({ id: favoritesId, title: 'Favorites' });
        setPlaylists(list);

        // Fetch all playlist items concurrently for faster load times.
        const itemsPromises = list.map((pl) =>
          fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${pl.id}&maxResults=50&key=${apiKey}`
          ).then((res) => res.json())
        );

        const itemsResults = await Promise.all(itemsPromises);
        const allVideos = [];
        itemsResults.forEach((itemsData, idx) => {
          const pl = list[idx];
          itemsData.items?.forEach((item) => {
            const id = item.snippet.resourceId.videoId;
            allVideos.push({
              id,
              title: item.snippet.title,
              playlist: pl.title,
              publishedAt: item.snippet.publishedAt,
              thumbnail: item.snippet.thumbnails?.medium?.url,
              channelTitle: item.snippet.channelTitle,
              url: `https://www.youtube.com/watch?v=${id}`,
            });
          });
        });
        setVideos(allVideos);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load YouTube data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [apiKey, initialVideos.length]);

  // When initial videos are passed in (e.g. during tests), populate playlists
  // from that data so the category tabs render correctly.
  useEffect(() => {
    if (initialVideos.length) {
      const titles = Array.from(new Set(initialVideos.map((v) => v.playlist)));
      setPlaylists(titles.map((title) => ({ id: title, title })));
    }
  }, [initialVideos]);

  const categories = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set([
          ...playlists.map((p) => p.title),
          ...videos.map((v) => v.playlist),
        ])
      ),
    ],
    [playlists, videos]
  );

  const filtered = useMemo(
    () =>
      videos
        .filter(
          (v) => activeCategory === 'All' || v.playlist === activeCategory
        )
        .filter((v) => v.title.toLowerCase().includes(search.toLowerCase())),
    [videos, activeCategory, search]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'playlist':
          comparison = a.playlist.localeCompare(b.playlist);
          break;
        case 'date':
        default:
          comparison =
            new Date(a.publishedAt) - new Date(b.publishedAt);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortKey, sortDir]);

  if (!apiKey && videos.length === 0) {
    return (
      <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-2">
        <p>YouTube API key is not configured.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      {/* Search + sorting */}
      <div className="p-2 sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-ub-cool-grey">
        <input
          placeholder="Search"
          className="flex-1 text-black px-2 py-1 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <div className="flex items-center space-x-1">
          <select
            id="sort"
            className="text-black px-2 py-1 rounded"
            value={sortKey}
            onChange={(e) => {
              const key = e.target.value;
              setSortKey(key);
              setSortDir(key === 'date' ? 'desc' : 'asc');
            }}
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="playlist">Playlist</option>
          </select>
          <button
            aria-label="Toggle sort direction"
            className="p-1 rounded bg-white/20 text-black"
            onClick={() =>
              setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
            }
          >
            {sortDir === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto flex space-x-4 px-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap pb-1 ${
              activeCategory === cat ? 'border-b-2 border-red-500 font-bold' : ''
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video list */}
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sorted.map((video) => (
          <div
            key={video.id}
            data-testid="video-card"
            className="flex flex-col space-y-1 bg-black/20 p-2 rounded transition hover:shadow-md"
          >
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              {video.thumbnail && (
                <img src={video.thumbnail} alt={video.title} className="w-full rounded" />
              )}
              <div className="font-semibold line-clamp-2">{video.title}</div>
            </a>
            <div className="text-xs text-gray-300">
              {video.playlist} • {new Date(video.publishedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="p-2 text-center text-sm text-gray-300">Loading…</div>
      )}
    </div>
  );
}

// Wrapper used by the window manager in this portfolio project.
export const displayYouTube = () => <YouTubeApp />;

