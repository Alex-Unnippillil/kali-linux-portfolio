'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';
import { DEFAULT_WALLPAPER } from '../../../lib/wallpapers';

type WallpaperOption = {
  id: string;
  name?: string;
  src: string;
};

export default function BackgroundSlideshow() {
  const { setWallpaper } = useSettings();
  const [available, setAvailable] = useState<WallpaperOption[]>([]);
  const [selected, setSelected] = usePersistentState<string[]>(
    'bg-slideshow-selected',
    [],
  );
  const [intervalMs, setIntervalMs] = usePersistentState<number>(
    'bg-slideshow-interval',
    30000,
  );
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    fetch('/api/wallpapers')
      .then((res) => res.json())
      .then((items: WallpaperOption[]) => {
        if (Array.isArray(items)) {
          setAvailable(
            items.filter(
              (item) => typeof item?.src === 'string' && typeof item?.id === 'string',
            ),
          );
        } else {
          setAvailable([]);
        }
      })
      .catch(() => setAvailable([]));
  }, []);

  useEffect(() => {
    if (available.length === 0) return;
    setSelected((prev) =>
      prev.filter((id) => available.some((item) => item.id === id)),
    );
  }, [available, setSelected]);

  useEffect(() => {
    if (!playing || selected.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const run = () => {
      const currentId = selected[indexRef.current % selected.length];
      const target = available.find((item) => item.id === currentId);
      setWallpaper(target?.id || DEFAULT_WALLPAPER.id);
      indexRef.current = (indexRef.current + 1) % selected.length;
    };
    run();
    timerRef.current = setInterval(run, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, intervalMs, selected, setWallpaper]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id],
    );
  };

  return (
    <div className="p-4 space-y-4 text-ubt-grey">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {available.map((option) => (
          <label key={option.id} className="flex flex-col items-center cursor-pointer">
            <Image
              src={option.src}
              alt={option.name || option.id}
              width={96}
              height={64}
              sizes="96px"
              className="object-cover mb-1 border border-ubt-cool-grey"
            />
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="interval">Interval (s):</label>
        <input
          id="interval"
          type="number"
          min={5}
          value={Math.round(intervalMs / 1000)}
          onChange={(e) => setIntervalMs(Number(e.target.value) * 1000)}
          className="w-20 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        />
      </div>
      <button
        onClick={() => setPlaying((p) => !p)}
        disabled={selected.length === 0}
        className="px-4 py-2 rounded bg-ub-cool-grey border border-ubt-cool-grey hover:bg-ubt-cool-grey disabled:opacity-50"
      >
        {playing ? 'Pause' : 'Start'}
      </button>
    </div>
  );
}
