import React, { useEffect, useState } from 'react';

const CHANNEL_HANDLE = 'Alex-Unnippillil';

// Renders a small YouTube browser similar to the YouTube mobile UI.
// Videos can be fetched from the real API if an API key is provided or
// injected via the `initialVideos` prop (used in tests).
export default function YouTubeApp({ initialVideos = [] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [playlists, setPlaylists] = useState([]); // [{id,title}]
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [search, setSearch] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // Fetch videos from YouTube when an API key is available and no initial
  // videos are supplied. This mirrors the behaviour of the original app but
  // keeps the logic concise.
  useEffect(() => {
    if (!apiKey || initialVideos.length) return;

    async function fetchData() {
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
        const list = playlistsData.items?.map((p) => ({
          id: p.id,
          title: p.snippet.title,
        })) || [];

        // Include the automatically generated "Liked videos" playlist
        const favoritesId = `LL${channelId}`;
        list.push({ id: favoritesId, title: 'Favorites' });
        setPlaylists(list);

        const allVideos = [];
        for (const pl of list) {
          const itemsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${pl.id}&maxResults=50&key=${apiKey}`
          );
          const itemsData = await itemsRes.json();
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
        }
        setVideos(allVideos);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load YouTube data', err);
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

  if (!apiKey && videos.length === 0) {
    return (
      <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-2">
        <p>YouTube API key is not configured.</p>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set([...playlists.map((p) => p.title), ...videos.map((v) => v.playlist)]))];

  const filtered = videos
    .filter((v) => activeCategory === 'All' || v.playlist === activeCategory)
    .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'dateAsc':
        return new Date(a.publishedAt) - new Date(b.publishedAt);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'playlist':
        return a.playlist.localeCompare(b.playlist);
      case 'date':
      default:
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    }
  });

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      {/* Search + sorting */}
      <div className="p-2 flex items-center space-x-2">
        <input
          placeholder="Search"
          className="flex-1 text-black px-2 py-1 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <select
          id="sort"
          className="text-black px-2 py-1 rounded"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date">Newest First</option>
          <option value="dateAsc">Oldest First</option>
          <option value="title">Title (A-Z)</option>
          <option value="playlist">Playlist</option>
        </select>
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
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sorted.map((video) => (
          <div key={video.id} data-testid="video-card" className="flex flex-col space-y-1">
            <a href={video.url} target="_blank" rel="noreferrer" className="block">
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
    </div>
  );
}

// Wrapper used by the window manager in this portfolio project.
export const displayYouTube = () => <YouTubeApp />;

