import React from "react";

export interface LockControlsProps {
  title: string;
  artist: string;
  album?: string;
  coverArt?: string;
  accentColor?: string;
  isPlaying: boolean;
  elapsed: number;
  duration: number;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  className?: string;
}

const clampProgress = (value: number) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const LockControls: React.FC<LockControlsProps> = ({
  title,
  artist,
  album,
  coverArt,
  accentColor = "#38bdf8",
  isPlaying,
  elapsed,
  duration,
  onPrevious,
  onNext,
  onTogglePlay,
  className = "",
}) => {
  const progress = clampProgress(duration > 0 ? elapsed / duration : 0);
  const gradientBackground = `linear-gradient(135deg, ${accentColor}, rgba(15, 23, 42, 0.85))`;

  return (
    <section
      aria-label="Lock screen media controls"
      className={`flex flex-col gap-4 rounded-3xl bg-slate-900/50 p-5 text-white shadow-2xl backdrop-blur-xl transition-colors duration-300 ${className}`}
    >
      <div className="flex items-center gap-4">
        <div
          className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg"
          aria-hidden="true"
        >
          {coverArt ? (
            <img
              src={coverArt}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: gradientBackground }}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
            Now Playing
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold leading-tight">
            {title}
          </h3>
          <p className="truncate text-sm text-slate-200">
            {artist}
            {album ? ` • ${album}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div
          className="relative h-2 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(progress * duration)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/80"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[0.7rem] tracking-wide text-slate-300">
          <span>{formatTime(elapsed)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={onPrevious}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Play previous track"
        >
          <span aria-hidden="true">⏮</span>
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded-full bg-white px-6 py-3 text-lg font-semibold uppercase tracking-wider text-slate-900 shadow-lg transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label={isPlaying ? "Pause playback" : "Resume playback"}
        >
          <span aria-hidden="true">{isPlaying ? "⏸" : "▶"}</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Play next track"
        >
          <span aria-hidden="true">⏭</span>
        </button>
      </div>
    </section>
  );
};

export default LockControls;
