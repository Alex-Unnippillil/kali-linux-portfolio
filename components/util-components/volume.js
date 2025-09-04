"use client";

import { useState } from "react";
import Image from "next/image";
import useGameAudio from "../../hooks/useGameAudio";

// Small volume control used in the top status bar.  Scrolling adjusts the
// volume in 5% increments.  Clicking the icon opens a popover with a range
// slider as well as a stub "Open Mixer" link.  The volume value itself is
// persisted via the `useGameAudio` hook so changes are shared across apps.

export default function Volume() {
  const { volume, setVolume } = useGameAudio();
  const [open, setOpen] = useState(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setVolume((v) => Math.max(0, Math.min(1, Math.round((v + delta) * 100) / 100)));
  };

  const icon =
    volume === 0
      ? "/themes/Yaru/status/audio-volume-muted-symbolic.svg"
      : volume < 0.33
      ? "/themes/Yaru/status/audio-volume-low-symbolic.svg"
      : volume < 0.66
      ? "/themes/Yaru/status/audio-volume-medium-symbolic.svg"
      : "/themes/Yaru/status/audio-volume-high-symbolic.svg";

  return (
    <span className="mx-1.5 relative inline-block" onWheel={handleWheel}>
      <button type="button" onClick={() => setOpen(!open)} aria-label="Volume">
        <Image
          width={16}
          height={16}
          src={icon}
          alt="volume"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 p-2 bg-ub-cool-grey rounded shadow border border-black border-opacity-20 z-50">
          <div className="mb-2 text-xs text-center">Speakers</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-full"
          />
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="block mt-2 text-xs text-center text-ubt-grey underline"
          >
            Open Mixer
          </a>
        </div>
      )}
    </span>
  );
}

