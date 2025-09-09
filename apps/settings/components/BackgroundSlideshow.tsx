'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';

export default function BackgroundSlideshow() {
  const { setWallpaper } = useSettings();
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = usePersistentState<string[]>(
    'bg-slideshow-selected',
    [],
  );
  const [intervalMs, setIntervalMs] = usePersistentState<number>(
    'bg-slideshow-interval',
    30000,
  );
  const [mode, setMode] = usePersistentState<'off' | 'daily' | 'login'>(
    'bg-slideshow-mode',
    'off',
  );
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    fetch('/api/wallpapers')
      .then((res) => res.json())
      .then((files: string[]) => setAvailable(files))
      .catch(() => setAvailable([]));
  }, []);

  useEffect(() => {
    if (!playing || selected.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const run = () => {
      const file = selected[indexRef.current % selected.length];
      if (!file) return;
      const base = file.replace(/\.[^.]+$/, '');
      setWallpaper(base);
      indexRef.current = (indexRef.current + 1) % selected.length;
    };
    run();
    timerRef.current = setInterval(run, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, intervalMs, selected, setWallpaper]);

  const toggle = (file: string) => {
    setSelected((prev) =>
      prev.includes(file)
        ? prev.filter((f) => f !== file)
        : [...prev, file],
    );
  };

  return (
    <div className="p-4 space-y-4 text-ubt-grey">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {available.map((file) => (
          <label key={file} className="flex flex-col items-center cursor-pointer">
            <Image
              src={`/images/wallpapers/${file}`}
              alt={file}
              width={96}
              height={64}
              sizes="96px"
              className="object-cover mb-1 border border-ubt-cool-grey"
            />
            <input
              type="checkbox"
              checked={selected.includes(file)}
              onChange={() => toggle(file)}
              aria-label={file}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="mode">Rotate:</label>
        <select
          id="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'off' | 'daily' | 'login')}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="off">Off</option>
          <option value="daily">Daily rotate</option>
          <option value="login">Every login rotate</option>
        </select>
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
            disabled={mode !== 'off'}
            aria-label="Interval in seconds"
          />
      </div>
      <button
        onClick={() => setPlaying((p) => !p)}
        disabled={selected.length === 0 || mode !== 'off'}
        className="px-4 py-2 rounded bg-ub-cool-grey border border-ubt-cool-grey hover:bg-ubt-cool-grey disabled:opacity-50"
      >
        {playing ? 'Pause' : 'Start'}
      </button>
    </div>
  );
}
