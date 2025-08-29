'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useWatchLater, {
  Video as WatchLaterVideo,
} from '../../../apps/youtube/state/watchLater';

type Video = WatchLaterVideo;

interface Props {
  initialResults?: Video[];
}

const VIDEO_CACHE_NAME = 'youtube-video-cache';
const CACHED_LIST_KEY = 'youtube:cached-videos';
const MAX_CACHE_BYTES = 100 * 1024 * 1024;

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
  const timer = useRef<NodeJS.Timeout>();

  const fetchInfo = useCallback(async () => {
    if (info) return;
    try {
      const res = await fetch(`https://piped.video/api/v1/channel/${id}`);
      const data = await res.json();
      setInfo(data);
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
    clearTimeout(timer.current);
    setShow(false);
  };

  return (
    <span className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {name}
      {show && info && (
        <div className="absolute z-10 mt-1 w-48 rounded bg-gray-800 p-2 text-xs text-white shadow">
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
}: {
  queue: Video[];
  watchLater: Video[];
  onPlay: (v: Video) => void;
  onReorder: (from: number, to: number) => void;
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

  return (
    <aside className="w-64 overflow-y-auto border-l border-gray-700 bg-gray-800 p-2 text-sm" role="complementary">
      <h2 className="mb-2 text-lg font-semibold">Queue</h2>
      <div data-testid="queue-list">
        {queue.map((v) => (
          <div
            key={v.id}
            className="mb-2 cursor-pointer"
            onClick={() => onPlay(v)}
          >
            <img src={v.thumbnail} alt="" className="h-24 w-full rounded object-cover" />
            <div>{v.title}</div>
          </div>
        ))}
        {!queue.length && <div className="text-gray-400">Empty</div>}
      </div>
      <h2 className="mb-2 mt-4 text-lg font-semibold">Watch Later</h2>
      <div data-testid="watch-later-list">
        {watchLater.map((v, i) => (
          <div
            key={v.id}
            className="mb-2 cursor-pointer"
            onClick={() => onPlay(v)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(i, e)}
            tabIndex={0}
            onKeyDown={(e) => handleKey(i, e)}
          >
            <img src={v.thumbnail} alt="" className="h-24 w-full rounded object-cover" />
            <div>{v.title}</div>
          </div>
        ))}
        {!watchLater.length && <div className="text-gray-400">Empty</div>}
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
  const ITEM_HEIGHT = 220;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const newCols = Math.max(1, Math.floor(width / 220));
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
                padding: '0.5rem',
              }}
            >
              <div className="cursor-pointer" onClick={() => onPlay(v)}>
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="h-40 w-full rounded object-cover"
                />
                <div className="mt-1 line-clamp-2 text-sm">{v.title}</div>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <ChannelHovercard id={v.channelId} name={v.channelName} />
                <div className="space-x-2">
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [theater, setTheater] = useState(false);

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
    if (!looping || loopStart === null || loopEnd === null) return;
    const id = window.setInterval(() => {
      const cur = playerRef.current?.getCurrentTime() ?? 0;
      if (cur >= loopEnd) {
        playerRef.current?.seekTo(loopStart, true);
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

  const changeSpeed = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
    setPlaybackRate(rate);
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

  const search = useCallback(async () => {
    if (!query) return;
    try {
      const res = await fetch(
        `https://piped.video/api/v1/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      const vids: Video[] = (data.items || data)
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
      setWatchLater((w) => (w.some((x) => x.id === v.id) ? w : [...w, v])),
    []
  );
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
  const playNext = useCallback(() => {
    setQueue((q) => {
      if (q.length) {
        const [next, ...rest] = q;
        setCurrent(next);
        return rest;
      }
      return q;
    });
  }, []);

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
      } else if (e.key.toLowerCase() === 't') {
        setTheater((t) => !t);
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
    setTheater,
  ]);

  return (
    <div className="flex h-full flex-1 bg-gray-900 text-white">
      <div className="flex flex-1 flex-col">
        <form onSubmit={handleSearch} className="p-4">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube"
            className="w-full rounded bg-gray-800 p-2"
          />
        </form>
        {current && (
          <div
            className={
              theater
                ? 'fixed inset-0 z-50 flex flex-col bg-black'
                : 'mx-4 mb-4 bg-black'
            }
          >
            {!playerReady && (
              <iframe
                title="YouTube video player"
                src={`https://www.youtube-nocookie.com/embed/${current.id}`}
                className={`${theater ? 'flex-1' : 'aspect-video'} w-full`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            <div
              ref={playerDivRef}
              className={`${playerReady ? '' : 'hidden'} ${theater ? 'flex-1' : 'aspect-video'} w-full`}
            />
            <div className="flex items-center gap-2 bg-gray-800 p-2 text-xs">
              <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
              <label className="flex items-center gap-1">
                Speed
                <select
                  value={playbackRate}
                  onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                  className="rounded bg-gray-900 p-1"
                >
                  {[0.25, 0.5, 1, 1.5, 2].map((r) => (
                    <option key={r} value={r}>{`${r}x`}</option>
                  ))}
                </select>
              </label>
              <button onClick={markStart} title="Set loop start (A)">A</button>
              <button onClick={markEnd} title="Set loop end (B)">B</button>
              <button
                onClick={toggleLoop}
                disabled={loopStart === null || loopEnd === null}
                className={looping ? 'font-bold' : ''}
                title="Toggle loop (S)"
              >
                Loop
              </button>
              <button onClick={downloadCurrent} title="Download video">
                Download
              </button>
              <button onClick={() => setTheater((t) => !t)} title="Toggle theater (T)">
                {theater ? 'Default' : 'Theater'}
              </button>
            </div>
          </div>
        )}
        <VirtualGrid
          items={results}
          onPlay={setCurrent}
          onQueue={addQueue}
          onWatchLater={addWatchLater}
        />
      </div>
      <Sidebar
        queue={queue}
        watchLater={watchLater}
        onPlay={setCurrent}
        onReorder={moveWatchLater}
      />
    </div>
  );
}

