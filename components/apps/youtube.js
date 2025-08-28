import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import Image from 'next/image';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

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

  // Currently playing video and player state
  const [currentVideo, setCurrentVideo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [isMini, setIsMini] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const tabListRef = useRef(null);
  const progressRaf = useRef();
  const scrollRaf = useRef();

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

        // Replace the existing feed and deduplicate by video ID to
        // prevent stale entries from accumulating in the list.
        const flat = allVideosData.flat();
        const unique = Array.from(new Map(flat.map((v) => [v.id, v])).values());
        setVideos(unique);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load YouTube data', err);
      }
    }

    fetchData();
  }, [apiKey, initialVideos.length]);

  // Track prefers-reduced-motion to disable transitions/animations
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handle = () => setPrefersReducedMotion(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Initialize and monitor the YouTube player when a video is selected
  useEffect(() => {
    if (!currentVideo) return;
    let player;

    const onReady = () => {
      const d = player.getDuration();
      setDuration(d);
      const c = player.getVideoData()?.chapters || [];
      setChapters(c);
    };

    const onStateChange = (e) => {
      if (e.data === window.YT.PlayerState.PLAYING) {
        const update = () => {
          const d = player.getDuration();
          const t = player.getCurrentTime();
          if (d) setProgress(t / d);
          if (prefersReducedMotion) {
            progressRaf.current = setTimeout(update, 1000);
          } else {
            progressRaf.current = requestAnimationFrame(update);
          }
        };
        update();
      } else {
        if (prefersReducedMotion) {
          clearTimeout(progressRaf.current);
        } else {
          cancelAnimationFrame(progressRaf.current);
        }
      }
    };

    const createPlayer = () => {
      player = new window.YT.Player(playerRef.current, {
        videoId: currentVideo.id,
        host: 'https://www.youtube-nocookie.com',
        events: {
          onReady,
          onStateChange,
        },
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube-nocookie.com/iframe_api';
      tag.async = true;
      window.onYouTubeIframeAPIReady = createPlayer;
      document.body.appendChild(tag);
    } else {
      createPlayer();
    }

    return () => {
      if (prefersReducedMotion) {
        clearTimeout(progressRaf.current);
      } else {
        cancelAnimationFrame(progressRaf.current);
      }
      player?.destroy();
    };
  }, [currentVideo, prefersReducedMotion]);

  useEffect(() => {
    if (!currentVideo) return;
    const handleKey = (e) => {
      if (!playerRef.current) return;
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const state = playerRef.current.getPlayerState();
        if (state === window.YT.PlayerState.PLAYING) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentVideo]);

  useRovingTabIndex(tabListRef, true, 'horizontal');

  // Dock the player as a mini version when scrolled out of view
  useEffect(() => {
    if (!currentVideo) return;
    const checkMini = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setIsMini(rect.top < 0);
    };
    const onScroll = () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(checkMini);
    };
    checkMini();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(scrollRaf.current);
    };
  }, [currentVideo]);

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
        new Set(
          [
            ...playlists.map((p) => p.title),
            ...videos.map((v) => v.playlist),
          ].filter(Boolean)
        )
      ),
    ],
    [playlists, videos]
  );

  const filtered = useMemo(
    () =>
      videos
        .filter((v) => activeCategory === 'All' || v.playlist === activeCategory)
        .filter((v) =>
          (v.title || '').toLowerCase().includes(search.toLowerCase())
        ),
    [videos, activeCategory, search]
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'dateAsc':
        return list.sort((a, b) =>
          new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0)
        );
      case 'title':
        return list.sort((a, b) =>
          (a.title || '').localeCompare(b.title || '')
        );
      case 'playlist':
        return list.sort((a, b) =>
          (a.playlist || '').localeCompare(b.playlist || '')
        );
      case 'date':
      default:
        return list.sort((a, b) =>
          new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
        );
    }
  }, [filtered, sortBy]);

  const handleCategoryClick = useCallback((cat) => setActiveCategory(cat), []);

  const handleSortChange = useCallback((e) => {
    const { value } = e.target;
    setSortBy(value);
  }, []);

  const handleSearchChange = useCallback((e) => {
    const { value } = e.target;
    setSearch(value);
  }, []);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      {currentVideo && (
        <div
          ref={containerRef}
          className={`bg-black ${
            isMini
              ? 'fixed bottom-2 right-2 w-48 z-50 shadow-lg'
              : 'w-full'
          } ${prefersReducedMotion ? '' : 'transition-all duration-300'}`}
        >
          <div className={isMini ? 'w-full h-28' : 'relative w-full pb-[56.25%]'}>
            <div
              ref={playerRef}
              className={isMini ? 'w-full h-full' : 'absolute inset-0'}
            />
          </div>
          <div
            className="relative h-2 bg-gray-700"
            role="progressbar"
            aria-label="Video progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="absolute top-0 left-0 h-full bg-red-600"
              style={{ width: `${progress * 100}%` }}
            />
            {chapters.map((ch, i) => {
              const start = ch.startTime || 0;
              const end = chapters[i + 1]?.startTime ?? duration;
              const left = (start / duration) * 100;
              const width = ((end - start) / duration) * 100;
              const heat = (i + 1) / chapters.length;
              return (
                <div
                  key={i}
                  aria-hidden="true"
                  className="absolute top-0 h-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: `rgba(59,130,246,${0.3 + 0.7 * heat})`,
                  }}
                />
              );
            })}
          </div>
          <div className="sr-only" aria-live="polite">
            {`Progress ${Math.round(progress * 100)} percent`}
          </div>
        </div>
      )}
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
          <div
            className="overflow-x-auto px-3 pb-2 flex flex-wrap gap-2"
            role="tablist"
            ref={tabListRef}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                role="tab"
                aria-selected={activeCategory === cat}
                tabIndex={activeCategory === cat ? 0 : -1}
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
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentVideo(video);
                  }}
                >
                  {video.thumbnail && (
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full"
                      loading="lazy"
                      width={320}
                      height={180}
                    />
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

