"use client";

import React from "react";
import usePersistedState from "../../hooks/usePersistedState";

const AudioPopover: React.FC = () => {
  const [volume, setVolume] = usePersistedState<number>(
    "settings:volume",
    1
  );
  const [muted, setMuted] = usePersistedState<boolean>(
    "settings:muted",
    false
  );

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (muted && v > 0) setMuted(false);
  };

  const toggleMute = () => setMuted(!muted);

  return (
    <div
      className="p-2 flex items-center space-x-2 w-48"
      style={{ ["--volume" as any]: muted ? 0 : volume }}
    >
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute audio" : "Mute audio"}
        className="p-1"
      >
        <div className="volume-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleVolumeChange}
        className="flex-1 ubuntu-slider"
        aria-label="Volume"
      />
      <style jsx>{`
        .volume-icon {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          width: 16px;
          height: 12px;
        }
        .volume-icon span {
          width: 3px;
          background: currentColor;
          transform-origin: bottom;
          transition: transform var(--motion-fast);
        }
        .volume-icon span:nth-child(1) {
          height: 4px;
          transform: scaleY(var(--volume));
        }
        .volume-icon span:nth-child(2) {
          height: 8px;
          transform: scaleY(var(--volume));
        }
        .volume-icon span:nth-child(3) {
          height: 12px;
          transform: scaleY(var(--volume));
        }
      `}</style>
    </div>
  );
};

export default AudioPopover;

