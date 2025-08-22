import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useTransition,
} from 'react';

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
  const [, startTransition] = useTransition();

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

        // Helper to fetch *all* videos from a playlist by following the
        // YouTube API's `nextPageToken` pagination.
        async function fetchPlaylistVideos(pl) {
          let pageToken;
          const items = [];

          do {
            const tokenParam = pageToken ? `&pageToken=${pageToken}` : '';
            const res = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${pl.id}&maxResults=50&key=${apiKey}${tokenParam}`
            );
            const data = await res.json();

            items.push(
              ...(data.items?.map((item) => {
                const id = item.snippet.resourceId.videoId;
                return {
                  id,
                  title: item.snippet.title,
                  playlist: pl.title,
                  publishedAt: item.snippet.publishedAt,
                  thumbnail: item.snippet.thumbnails?.medium?.url,
                  channelTitle: item.snippet.channelTitle,
                  url: `https://www.youtube.com/watch?v=${id}`,
                };
              }) || [])
            );

            pageToken = data.nextPageToken;
          } while (pageToken);

          return items;
        }

        const allVideosData = await Promise.all(
          list.map((pl) => fetchPlaylistVideos(pl))
        );
        setVideos(allVideosData.flat());
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
        .filter((v) => activeCategory === 'All' || v.playlist === activeCategory)
        .filter((v) =>
          v.title.toLowerCase().includes(search.toLowerCase())
        ),
    [videos, activeCategory, search]
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'dateAsc':
        return list.sort(
          (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)
        );
      case 'title':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'playlist':
        return list.sort((a, b) => a.playlist.localeCompare(b.playlist));
      case 'date':
      default:
        return list.sort(
          (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
        );
    }
  }, [filtered, sortBy]);

  const handleCategoryClick = useCallback(
    (cat) => startTransition(() => setActiveCategory(cat)),
    [startTransition]
  );

  const handleSortChange = useCallback(
    (e) => {
      const { value } = e.target;
      startTransition(() => setSortBy(value));
    },
    [startTransition]
  );

  const handleSearchChange = useCallback(
    (e) => {
      const { value } = e.target;
      startTransition(() => setSearch(value));
    },
    [startTransition]
  );

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      {!apiKey && videos.length === 0 ? (
        <div className="p-2">
          <p>YouTube API key is not configured.</p>
        </div>
      ) : (
        <>
          {/* Search + sorting */}
          <div className="p-3 flex flex-wrap items-center gap-2">
            <input
              placeholder="Search"
              className="flex-1 min-w-[150px] text-black px-3 py-2 rounded"
              value={search}
              onChange={handleSearchChange}
            />
            <label htmlFor="sort" className="sr-only">
              Sort by
            </label>
            <select
              id="sort"
              className="text-black px-3 py-2 rounded"
              value={sortBy}
              onChange={handleSortChange}
            >
              <option value="date">Newest First</option>
              <option value="dateAsc">Oldest First</option>
              <option value="title">Title (A-Z)</option>
              <option value="playlist">Playlist</option>
            </select>
          </div>

          {/* Category tabs */}
          <div className="overflow-x-auto px-3 pb-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Video list */}
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {sorted.map((video) => (
              <div
                key={video.id}
                data-testid="video-card"
                className="bg-gray-800 rounded-lg overflow-hidden shadow flex flex-col hover:shadow-lg transition"
              >
                <a href={video.url} target="_blank" rel="noreferrer" className="block">
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="w-full" />
                  )}
                  <div className="p-2 font-semibold text-sm line-clamp-2">
                    {video.title}
                  </div>
                </a>
                <div className="px-2 pb-2 text-xs text-gray-300">
                  {video.playlist} • {new Date(video.publishedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Wrapper used by the window manager in this portfolio project.
export const displayYouTube = () => <YouTubeApp />;

