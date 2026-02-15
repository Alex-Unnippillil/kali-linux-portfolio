"use client";

import React, { useEffect, useState } from "react";

interface Track {
  title: string;
  artist: string;
}

const TRACKS: Track[] = [
  { title: "First Light", artist: "DJ Lambda" },
  { title: "Midnight Groove", artist: "The Reactors" },
  { title: "Sunset Drive", artist: "TypeScript Trio" },
];

export default function Volume() {
  const [volume, setVolume] = useState(50);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  // When playing, automatically advance to the next track every 5 seconds
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrent((idx) => (idx + 1) % TRACKS.length);
    }, 5000);
    return () => clearInterval(id);
  }, [playing]);

  const track = TRACKS[current];

  const prev = () =>
    setCurrent((idx) => (idx - 1 + TRACKS.length) % TRACKS.length);
  const next = () => setCurrent((idx) => (idx + 1) % TRACKS.length);
  const toggle = () => setPlaying((p) => !p);

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="flex items-center space-x-2">
        <label htmlFor="volume" className="text-ubt-grey">
          Volume
        </label>
        <input
          id="volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          className="ubuntu-slider flex-1"
          aria-label="Volume"
        />
        <span>{volume}%</span>
      </div>
      <div className="border-t border-ubc-200 pt-4">
        <h2 className="text-ubt-grey mb-2">Now Playing</h2>
        <div className="mb-2">
          <div className="font-semibold">{track.title}</div>
          <div className="text-sm text-ubt-grey">{track.artist}</div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous track"
            className="px-2 py-1 bg-ub-cool-grey rounded"
          >
            ◀◀
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="px-2 py-1 bg-ub-cool-grey rounded"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next track"
            className="px-2 py-1 bg-ub-cool-grey rounded"
          >
            ▶▶
          </button>
        </div>
      </div>
    </div>
  );
}

