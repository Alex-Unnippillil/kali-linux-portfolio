'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useWatchLater, {
  Video as WatchLaterVideo,
} from '../../../apps/youtube/state/watchLater';

type Video = WatchLaterVideo;

interface Props {
  initialResults?: Video[];
}

type PlayerLike = {
  getPlaybackQuality?: () => string;
  getVideoStats?: () => Record<string, any> | null | undefined;
  getPlaybackRate?: () => number;
  getVideoLoadedFraction?: () => number;
};

interface StatsSnapshot {
  quality: string;
  resolution: string;
  droppedFrames: number | null;
  totalFrames: number | null;
  playbackRate: number;
  buffered: number | null;
}

const QUALITY_TO_RESOLUTION: Record<string, string> = {
  tiny: '256×144',
  small: '426×240',
  medium: '640×360',
  large: '854×480',
  hd720: '1280×720',
  hd1080: '1920×1080',
  hd1440: '2560×1440',
  hd2160: '3840×2160',
  highres: '≥4320p',
  highres60: '≥4320p60',
};

function getResolutionLabel(quality: string) {
  if (!quality) return 'Unknown';
  const mapped = QUALITY_TO_RESOLUTION[quality];
  return mapped ? `${mapped} (${quality})` : quality;
}

function StatsOverlay({
  player,
  video,
}: {
  player: PlayerLike | null;
  video: Video | null;
}) {
  const [stats, setStats] = useState<StatsSnapshot | null>(null);

  useEffect(() => {
    if (!player || !video) {
      setStats(null);
      return;
    }

    let mounted = true;

    const read = () => {
      if (!mounted) return;
      const quality = player.getPlaybackQuality?.() ?? '';
      const rawStats =
        typeof player.getVideoStats === 'function'
          ? player.getVideoStats() || null
          : null;
      const droppedRaw =
        rawStats?.droppedFrames ?? rawStats?.droppedframes ?? rawStats?.dropped;
      const totalRaw =
        rawStats?.totalFrames ?? rawStats?.totalframes ?? rawStats?.total;
      const playbackRateRaw = player.getPlaybackRate?.();
      const bufferedFraction = player.getVideoLoadedFraction?.();

      const snapshot: StatsSnapshot = {
        quality: quality || 'unknown',
        resolution: getResolutionLabel(quality || ''),
        droppedFrames:
          typeof droppedRaw === 'number' && Number.isFinite(droppedRaw)
            ? droppedRaw
            : null,
        totalFrames:
          typeof totalRaw === 'number' && Number.isFinite(totalRaw)
            ? totalRaw
            : null,
        playbackRate:
          typeof playbackRateRaw === 'number' && Number.isFinite(playbackRateRaw)
            ? playbackRateRaw
            : 1,
        buffered:
          typeof bufferedFraction === 'number' && Number.isFinite(bufferedFraction)
            ? Math.round(
                Math.max(0, Math.min(1, bufferedFraction)) * 100,
              )
            : null,
      };

      setStats((prev) => {
        if (
          prev &&
          prev.quality === snapshot.quality &&
          prev.resolution === snapshot.resolution &&
          prev.droppedFrames === snapshot.droppedFrames &&
          prev.totalFrames === snapshot.totalFrames &&
          prev.playbackRate === snapshot.playbackRate &&
          prev.buffered === snapshot.buffered
        ) {
          return prev;
        }
        return snapshot;
      });
    };

    read();
    const id = window.setInterval(read, 1000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [player, video?.id]);

  if (!player || !video || !stats) return null;

  return (
    <div
      data-testid="youtube-stats-overlay"
      className="pointer-events-auto absolute right-2 top-2 w-56 rounded bg-black/80 p-3 text-xs text-ubt-cool-grey shadow-lg backdrop-blur"
    >
      <div className="mb-2 font-semibold text-white">Playback stats</div>
      <dl className="space-y-1">
        <div>
          <dt className="font-semibold text-ubt-grey">Resolution</dt>
          <dd>{stats.resolution}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ubt-grey">Dropped frames</dt>
          <dd>
            {stats.droppedFrames !== null
              ? stats.totalFrames !== null
                ? `${stats.droppedFrames} / ${stats.totalFrames}`
                : stats.droppedFrames
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ubt-grey">Playback rate</dt>
          <dd>{stats.playbackRate.toFixed(2)}×</dd>
        </div>
        {stats.buffered !== null && (
          <div>
            <dt className="font-semibold text-ubt-grey">Buffered</dt>
            <dd>{stats.buffered}%</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

const VIDEO_CACHE_NAME = 'youtube-video-cache';
const CACHED_LIST_KEY = 'youtube:cached-videos';
const MAX_CACHE_BYTES = 100 * 1024 * 1024;
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

async function trimVideoCache() {
  if (!('storage' in navigator) || !navigator.storage?.estimate) return;
  let { usage = 0 } = await navigator.storage.estimate();
  if (usage <= MAX_CACHE_BYTES) return;
  const cache = await caches.open(VIDEO_CACHE_NAME);
  let list: { url: string; ts: number }[] = JSON.parse(
    localStorage.getItem(CACHED_LIST_KEY) || '[]',
  );
  list.sort((a, b) => a.ts - b.ts);
  while (usage > MAX_CACHE_BYTES && list.length) {
    const { url } = list.shift()!;
    await cache.delete(url);
    localStorage.setItem(CACHED_LIST_KEY, JSON.stringify(list));
    usage = (await navigator.storage.estimate()).usage || 0;
  }
}

function ChannelHovercard({ id, name }: { id: string; name: string }) {
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInfo = useCallback(async () => {
    if (info) return;
    try {
      if (YOUTUBE_API_KEY) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${id}&key=${YOUTUBE_API_KEY}`,
        );
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          setInfo({
            name: item.snippet?.title,
            subscriberCount: item.statistics?.subscriberCount,
          });
        }
      } else {
        const res = await fetch(`https://piped.video/api/v1/channel/${id}`);
        const data = await res.json();
        setInfo(data);
      }
    } catch {
      // ignore errors
    }
  }, [id, info]);

  const handleEnter = () => {
    timer.current = setTimeout(() => {
      setShow(true);
      void fetchInfo();
    }, 300);
  };

  const handleLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    setShow(false);
  };

  return (
    <span className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {name}
      {show && info && (
        <div className="absolute z-10 mt-1 w-48 rounded bg-ub-cool-grey p-2 text-xs text-ubt-cool-grey shadow">
          <div className="font-bold">{info.name}</div>
          {info.subscriberCount && <div>{info.subscriberCount} subs</div>}
        </div>
      )}
    </span>
  );
}

function Sidebar({
  queue,
  watchLater,
  onPlay,
  onReorder,
  className = '',
}: {
  queue: Video[];
  watchLater: Video[];
  onPlay: (v: Video) => void;
  onReorder: (from: number, to: number) => void;
  className?: string;
}) {
  const handleKey = (index: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onReorder(index, index - 1);
    } else if (e.key === 'ArrowDown' && index < watchLater.length - 1) {
      e.preventDefault();
      onReorder(index, index + 1);
    }
  };

  const handleDrop = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(from)) onReorder(from, index);
  };

  const asideClass = `overflow-y-auto bg-ub-cool-grey p-2 text-sm${
    className ? ` ${className}` : ''
  }`;

  return (
    <aside className={asideClass} role="complementary">
      <h2 className="mb-[6px] text-lg font-semibold">Queue</h2>
      <div data-testid="queue-list">
        {queue.map((v) => (
          <div
            key={v.id}
            className="mb-[6px] cursor-pointer"
            onClick={() => onPlay(v)}
          >
            <img src={v.thumbnail} alt="" className="h-24 w-full rounded object-cover" />
            <div>{v.title}</div>
          </div>
        ))}
        {!queue.length && <div className="text-ubt-grey">Empty</div>}
      </div>
      <h2 className="mb-[6px] mt-[24px] text-lg font-semibold">Watch Later</h2>
      <div data-testid="watch-later-list">
        {watchLater.map((v, i) => (
          <div
            key={`${v.id}-${v.start ?? 0}-${v.end ?? 0}`}
            className="mb-[6px] cursor-pointer"
            onClick={() => onPlay(v)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(i, e)}
            tabIndex={0}
            onKeyDown={(e) => handleKey(i, e)}
          >
            <img src={v.thumbnail} alt="" className="h-24 w-full rounded object-cover" />
            <div>{v.name || v.title}</div>
          </div>
        ))}
        {!watchLater.length && <div className="text-ubt-grey">Empty</div>}
      </div>
    </aside>
  );
}

function VirtualGrid({
  items,
  onPlay,
  onQueue,
  onWatchLater,
}: {
  items: Video[];
  onPlay: (v: Video) => void;
  onQueue: (v: Video) => void;
  onWatchLater: (v: Video) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [cols, setCols] = useState(3);
  // Align virtual grid items to a 6px rhythm
  const ITEM_HEIGHT = 216;

  const truncateTitle = (title: string) => {
    const MAX_CHARS = 80;
    if (title.length <= MAX_CHARS) return title;
    const half = Math.floor((MAX_CHARS - 1) / 2);
    return `${title.slice(0, half)}…${title.slice(title.length - half)}`;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const newCols = Math.max(1, Math.floor(width / 216));
      const height = el.clientHeight;
      const scrollTop = el.scrollTop;
      const startRow = Math.floor(scrollTop / ITEM_HEIGHT);
      const visibleRows = Math.ceil(height / ITEM_HEIGHT) + 2;
      setCols(newCols);
      setRange([startRow * newCols, (startRow + visibleRows) * newCols]);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items.length]);

  const totalRows = Math.ceil(items.length / cols);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      <div style={{ height: totalRows * ITEM_HEIGHT, position: 'relative' }}>
        {items.slice(range[0], range[1]).map((v, i) => {
          const index = range[0] + i;
          const row = Math.floor(index / cols);
          const col = index % cols;
          const left = (100 / cols) * col;
          return (
            <div
              key={v.id}
              style={{
                position: 'absolute',
                top: row * ITEM_HEIGHT,
                left: `${left}%`,
                width: `${100 / cols}%`,
                height: ITEM_HEIGHT,
                padding: '6px',
              }}
            >
              <div className="cursor-pointer" onClick={() => onPlay(v)}>
                <div className="relative">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="h-[162px] w-full rounded object-cover"
                  />
                  <div className="absolute bottom-[6px] right-[6px] flex gap-[6px] text-[12px]">
                    <span className="bg-black/70 px-1 text-white">CC</span>
                    <span className="bg-black/70 px-1 text-white">HD</span>
                  </div>
                </div>
                <div className="mt-[6px] text-sm line-clamp-2">
                  {truncateTitle(v.title)}
                </div>
              </div>
              <div className="mt-[6px] flex justify-between text-xs">
                <ChannelHovercard id={v.channelId} name={v.channelName} />
                <div className="space-x-[6px]">
                  <button onClick={() => onQueue(v)}>Queue</button>
                  <button onClick={() => onWatchLater(v)}>Later</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function YouTubeApp({ initialResults = [] }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Video[]>(initialResults);
  const [current, setCurrent] = useState<Video | null>(null);
  const [queue, setQueue] = useState<Video[]>([]);
  const [watchLater, setWatchLater] = useWatchLater();
  const searchRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [, setPlaybackRate] = useState(1);
  const [solidHeader, setSolidHeader] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolidHeader(window.scrollY > 0);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const downloadCurrent = useCallback(async () => {
    if (!current) return;
    try {
      const infoRes = await fetch(
        `https://piped.video/api/v1/streams/${current.id}`,
      );
      const info = await infoRes.json();
      const streamUrl =
        info?.videoStreams?.find((s: any) => s.container === 'mp4')?.url ||
        info?.videoStreams?.[0]?.url;
      if (!streamUrl) return;
      const response = await fetch(streamUrl);
      const cache = await caches.open(VIDEO_CACHE_NAME);
      await cache.put(streamUrl, response.clone());
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${current.title || current.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      const list: { url: string; ts: number }[] = JSON.parse(
        localStorage.getItem(CACHED_LIST_KEY) || '[]',
      );
      list.push({ url: streamUrl, ts: Date.now() });
      localStorage.setItem(CACHED_LIST_KEY, JSON.stringify(list));
      await trimVideoCache();
    } catch {
      // ignore errors
    }
  }, [current]);


  useEffect(() => {
    if (!current) return;

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.loadVideoById(current.id);
      } else {
        playerRef.current = new window.YT.Player(playerDivRef.current!, {
          videoId: current.id,
          events: {
            onReady: (e: any) => {
              setPlayerReady(true);
              setPlaybackRate(e.target.getPlaybackRate());
            },
            onStateChange: (e: any) => {
              setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = initPlayer;
      document.body.appendChild(tag);
    }
  }, [current]);

  useEffect(() => {
    void trimVideoCache();
  }, []);

  useEffect(() => {
    if (!playerReady || loopStart === null) return;
    playerRef.current?.seekTo(loopStart, true);
  }, [playerReady, loopStart, current]);

  useEffect(() => {
    if (loopStart === null || loopEnd === null) return;
    const id = window.setInterval(() => {
      const cur = playerRef.current?.getCurrentTime() ?? 0;
      if (cur >= loopEnd) {
        if (looping && loopStart !== null) {
          playerRef.current?.seekTo(loopStart, true);
        } else {
          playerRef.current?.pauseVideo();
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [looping, loopStart, loopEnd]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, []);


  const markStart = useCallback(
    () => setLoopStart(playerRef.current?.getCurrentTime() ?? null),
    [],
  );
  const markEnd = useCallback(
    () => setLoopEnd(playerRef.current?.getCurrentTime() ?? null),
    [],
  );
  const toggleLoop = useCallback(() => {
    if (loopStart !== null && loopEnd !== null) setLooping((l) => !l);
  }, [loopStart, loopEnd]);

  const toggleStatsOverlay = useCallback(
    () => setShowStats((value) => !value),
    [],
  );

  const toggleTheaterMode = useCallback(
    () => setIsTheaterMode((value) => !value),
    [],
  );

  const search = useCallback(async () => {
    if (!query) return;
    try {
      let vids: Video[] = [];
      if (YOUTUBE_API_KEY) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&part=snippet&type=video&q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        vids = (data.items || []).map((i: any) => ({
          id: i.id?.videoId,
          title: i.snippet?.title || 'Untitled',
          thumbnail:
            i.snippet?.thumbnails?.medium?.url ||
            i.snippet?.thumbnails?.default?.url ||
            '',
          channelName: i.snippet?.channelTitle || 'Unknown',
          channelId: i.snippet?.channelId || '',
        }));
      } else {
        const res = await fetch(
          `https://piped.video/api/v1/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        vids = (data.items || data)
          .filter((i: any) => i.type === 'stream' || i.id)
          .map((i: any) => ({
            id: i.id || i.url?.split('=')[1],
            title: i.title || 'Untitled',
            thumbnail: i.thumbnail || i.thumbnails?.[0]?.url || '',
            channelName: i.uploaderName || i.channelName || 'Unknown',
            channelId:
              i.uploaderUrl?.split('/').pop() ||
              i.channelUrl?.split('/').pop() ||
              '',
          }));
      }
      setResults(vids);
    } catch {
      // ignore errors
    }
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void search();
  };

  const addQueue = useCallback((v: Video) => setQueue((q) => [...q, v]), []);
  const addWatchLater = useCallback(
    (v: Video) =>
      setWatchLater((w) =>
        w.some(
          (x) => x.id === v.id && x.start === v.start && x.end === v.end,
        )
          ? w
          : [...w, v],
      ),
    [setWatchLater],
  );
  const shareClip = useCallback(async () => {
    if (!current || loopStart === null || loopEnd === null) return;
    const url = `https://youtu.be/${current.id}?start=${Math.floor(
      loopStart,
    )}&end=${Math.floor(loopEnd)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Clip URL', url);
    }
  }, [current, loopStart, loopEnd]);
  const saveClip = useCallback(() => {
    if (!current || loopStart === null || loopEnd === null) return;
    const name = window.prompt('Clip name?')?.trim();
    if (!name) return;
    addWatchLater({
      ...current,
      name,
      start: Math.floor(loopStart),
      end: Math.floor(loopEnd),
    });
  }, [current, loopStart, loopEnd, addWatchLater]);
  const moveWatchLater = useCallback(
    (from: number, to: number) => {
      setWatchLater((list) => {
        const next = [...list];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next;
      });
    },
    [setWatchLater],
  );
  const playVideo = useCallback((v: Video) => {
    setCurrent(v);
    setLoopStart(v.start ?? null);
    setLoopEnd(v.end ?? null);
    setLooping(false);
  }, []);
  const playNext = useCallback(() => {
    setQueue((q) => {
      if (q.length) {
        const [next, ...rest] = q;
        playVideo(next);
        return rest;
      }
      return q;
    });
  }, [playVideo]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === ' ' && current) {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'a') {
        markStart();
      } else if (e.key.toLowerCase() === 'b') {
        markEnd();
      } else if (e.key.toLowerCase() === 's') {
        toggleLoop();
      } else if (e.key.toLowerCase() === 'q' && current) {
        addQueue(current);
      } else if (e.key.toLowerCase() === 'l' && current) {
        addWatchLater(current);
      } else if (e.key.toLowerCase() === 'n') {
        playNext();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [
    current,
    addQueue,
    addWatchLater,
    playNext,
    togglePlay,
    markStart,
    markEnd,
    toggleLoop,
  ]);

  const layoutClass = isTheaterMode ? 'flex-col xl:flex-row' : 'flex-col lg:flex-row';
  const playerContainerClass = [
    'relative mb-4 w-full bg-black transition-all duration-300',
    isTheaterMode
      ? 'mx-auto max-w-6xl rounded-none sm:rounded-lg xl:max-w-7xl'
      : 'mx-4 rounded-lg',
  ].join(' ');
  const sidebarClass = isTheaterMode
    ? 'flex-shrink-0 w-full border-t border-ub-cool-grey xl:w-72 xl:max-w-sm xl:border-l xl:border-t-0'
    : 'flex-shrink-0 w-full border-t border-ub-cool-grey lg:w-64 lg:max-w-sm lg:border-l lg:border-t-0';

  return (
    <div
      className={`flex h-full flex-1 bg-ub-dark-grey font-sans text-ubt-cool-grey ${layoutClass}`}
    >
      <div className="flex flex-1 min-w-0 flex-col">
        <form onSubmit={handleSearch} className="p-4">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube"
            className="w-full rounded bg-ub-cool-grey p-2 text-ubt-cool-grey"
          />
        </form>
        {current && (
          <div
            className={playerContainerClass}
            data-state={isTheaterMode ? 'theater' : 'default'}
            data-testid="player-container"
          >
            {showStats && (
              <StatsOverlay
                player={playerReady ? playerRef.current : null}
                video={current}
              />
            )}
            {!playerReady && (
              <iframe
                title="YouTube video player"
                src={`https://www.youtube-nocookie.com/embed/${current.id}`}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            <div
              ref={playerDivRef}
              className={`${playerReady ? '' : 'hidden'} aspect-video w-full`}
            />
            <div
              className={`sticky top-0 z-10 flex items-center gap-[6px] p-[6px] transition-colors ${solidHeader ? 'bg-ub-cool-grey' : 'bg-transparent'}`}
            >
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="text-ubt-cool-grey hover:text-ubt-green"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path
                      fillRule="evenodd"
                      d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path
                      fillRule="evenodd"
                      d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={markStart}
                title="Set loop start (A)"
                aria-label="Set loop start"
                className="text-ubt-cool-grey hover:text-ubt-green"
              >
                <span className="flex h-6 w-6 items-center justify-center">A</span>
              </button>
              <button
                onClick={markEnd}
                title="Set loop end (B)"
                aria-label="Set loop end"
                className="text-ubt-cool-grey hover:text-ubt-green"
              >
                <span className="flex h-6 w-6 items-center justify-center">B</span>
              </button>
              <button
                onClick={toggleLoop}
                disabled={loopStart === null || loopEnd === null}
                aria-label="Toggle loop"
                className="text-ubt-cool-grey hover:text-ubt-green disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`h-6 w-6 ${looping ? 'text-ubt-green' : ''}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={shareClip}
                disabled={loopStart === null || loopEnd === null}
                aria-label="Copy share link"
                className="text-ubt-cool-grey hover:text-ubt-green disabled:opacity-50"
              >
                <span className="flex h-6 w-6 items-center justify-center">Link</span>
              </button>
              <button
                onClick={saveClip}
                disabled={loopStart === null || loopEnd === null}
                aria-label="Save clip"
                className="text-ubt-cool-grey hover:text-ubt-green disabled:opacity-50"
              >
                <span className="flex h-6 w-6 items-center justify-center">Save</span>
              </button>
              <button
                onClick={toggleStatsOverlay}
                aria-label={`${showStats ? 'Hide' : 'Show'} stats overlay`}
                title="Toggle stats overlay"
                aria-pressed={showStats}
                className="ml-auto text-ubt-cool-grey hover:text-ubt-green"
              >
                <span className="flex h-6 w-6 items-center justify-center">Stats</span>
              </button>
              <button
                onClick={toggleTheaterMode}
                aria-label={
                  isTheaterMode ? 'Exit theater mode' : 'Enter theater mode'
                }
                title="Toggle theater mode"
                aria-pressed={isTheaterMode}
                className="text-ubt-cool-grey hover:text-ubt-green"
              >
                <span className="flex h-6 w-6 items-center justify-center">Theater</span>
              </button>
              <button
                onClick={downloadCurrent}
                aria-label="Download video"
                className="text-ubt-cool-grey hover:text-ubt-green"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path
                    fillRule="evenodd"
                    d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
        <VirtualGrid
          items={results}
          onPlay={playVideo}
          onQueue={addQueue}
          onWatchLater={addWatchLater}
        />
      </div>
      <Sidebar
        queue={queue}
        watchLater={watchLater}
        onPlay={playVideo}
        onReorder={moveWatchLater}
        className={sidebarClass}
      />
    </div>
  );
}

