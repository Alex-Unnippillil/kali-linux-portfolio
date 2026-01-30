'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';

// Mock list if API fails or for simulation
const MOCK_WALLPAPERS = [
  "wall-1.webp", "wall-2.webp", "wall-3.webp", "wall-4.webp"
];

export default function BackgroundSlideshow() {
  const { setWallpaper } = useSettings();
  const [available, setAvailable] = useState<string[]>([]);
  // Store just the names, simplified
  const [selected, setSelected] = useState<string[]>([]);
  const [intervalMs, setIntervalMs] = useState(30000); // 30s default

  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    // Try to generic mock or fetch
    // Since we don't have the API guaranteed, let's use the ones we know exist from Settings index
    // Settings index uses wall-1 to wall-8.
    const walls = Array.from({ length: 8 }, (_, i) => `wall-${i + 1}.webp`);
    setAvailable(walls);
  }, []);

  useEffect(() => {
    if (!playing || selected.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const run = () => {
      const file = selected[indexRef.current % selected.length];
      const base = file.replace(/\.[^.]+$/, '');
      // Settings app expects "wall-1" without extension for setWallpaper
      setWallpaper(base);
      indexRef.current = (indexRef.current + 1) % selected.length;
    };

    // Run immediately? Maybe wait for interval.
    timerRef.current = setInterval(run, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, intervalMs, selected, setWallpaper]);

  const toggle = (file: string) => {
    setSelected((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  };

  return (
    <div className="p-4 rounded-xl bg-[var(--kali-panel-border)]/10 border border-[var(--kali-panel-border)]/20 space-y-4">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {available.map((file) => {
          const isSelected = selected.includes(file);
          return (
            <button
              key={file}
              onClick={() => toggle(file)}
              className={`
                    relative aspect-video rounded-md overflow-hidden border-2 transition-all
                    ${isSelected ? "border-[var(--kali-control)] opacity-100" : "border-transparent opacity-50 hover:opacity-80"}
                `}
            >
              {/* Visual indicator of selection */}
              {isSelected && (
                <div className="absolute inset-0 bg-[var(--kali-control)]/20 z-10 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[var(--kali-control)] rounded-full shadow-[0_0_8px_var(--kali-control)]" />
                </div>
              )}
              <img
                src={`/wallpapers/${file}`}
                alt={file}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
          <span className="text-xs text-[var(--color-text)]/70">Interval</span>
          <input
            type="number"
            min={3}
            max={300}
            value={intervalMs / 1000}
            onChange={(e) => setIntervalMs(Number(e.target.value) * 1000)}
            className="w-12 bg-transparent text-sm text-[var(--color-text)] text-center focus:outline-none border-b border-transparent focus:border-[var(--kali-control)]"
          />
          <span className="text-xs text-[var(--color-text)]/50">sec</span>
        </div>

        <button
          onClick={() => setPlaying(!playing)}
          disabled={selected.length === 0}
          className={`
                px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
                ${playing
              ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30'
              : 'bg-[var(--kali-control)] text-white hover:bg-[var(--kali-control)]/90 disabled:opacity-50 disabled:cursor-not-allowed'
            }
            `}
        >
          {playing ? 'Stop Slideshow' : 'Start Slideshow'}
        </button>
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-[var(--color-text)]/40 italic">Select wallpapers above to start a slideshow</p>
      )}
    </div>
  );
}
