'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelId: string;
}

const WATCH_LATER_KEY = 'youtube:watch-later';

interface Props {
  initialResults?: Video[];
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
}: {
  queue: Video[];
  watchLater: Video[];
  onPlay: (v: Video) => void;
}) {
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
        {watchLater.map((v) => (
          <div
            key={v.id}
            className="mb-2 cursor-pointer"
            onClick={() => onPlay(v)}
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
  const [watchLater, setWatchLater] = useState<Video[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(WATCH_LATER_KEY);
    if (saved) setWatchLater(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(watchLater));
  }, [watchLater]);

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
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
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
  }, [current, addQueue, addWatchLater, playNext]);

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
          <div className="mx-4 mb-4 aspect-video bg-black">
            <iframe
              title="YouTube video player"
              src={`https://www.youtube-nocookie.com/embed/${current.id}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <VirtualGrid
          items={results}
          onPlay={setCurrent}
          onQueue={addQueue}
          onWatchLater={addWatchLater}
        />
      </div>
      <Sidebar queue={queue} watchLater={watchLater} onPlay={setCurrent} />
    </div>
  );
}

