'use client';

import { useEffect, useState } from 'react';

export default function PulseAudio() {
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pulse-audio-volume');
      if (stored !== null) {
        const num = Number(stored);
        if (!Number.isNaN(num)) {
          return Math.min(100, Math.max(0, num));
        }
      }
    }
    return 50;
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('pulse-audio-volume', String(volume));
    } catch {
      /* ignore */
    }
  }, [volume]);

  const adjustVolume = (delta: number) => {
    setVolume((v) => {
      const next = Math.min(100, Math.max(0, v + delta));
      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    adjustVolume(e.deltaY < 0 ? 5 : -5);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  return (
    <div className="relative" onWheel={handleWheel}>
      <button
        type="button"
        aria-label="Volume"
        className="flex items-center justify-center w-6 h-6 text-white"
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-current"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3z" />
          <path d="M16 7c1.1.9 1.8 2.1 1.8 3.5s-.7 2.6-1.8 3.5M16 4c2.6 1.6 4.2 4.1 4.2 7s-1.6 5.4-4.2 7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 p-2 bg-gray-800 text-white rounded shadow-lg z-10">
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleChange}
            aria-label="Volume slider"
            className="w-full"
          />
          <a
            href="#"
            className="block text-center mt-2 text-ub-orange underline text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Mixer
          </a>
        </div>
      )}
    </div>
  );
}

