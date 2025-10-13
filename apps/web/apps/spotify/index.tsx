"use client";

import { useEffect, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import CrossfadePlayer from "./utils/crossfade";
import Visualizer from "./Visualizer";
import Lyrics from "./Lyrics";

interface Track {
  title: string;
  url: string;
  cover?: string;
}

const DEFAULT_PLAYLIST = [
  {
    title: "Song 1",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    title: "Song 2",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    title: "Song 3",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

const serialize = (tracks: Track[]) => JSON.stringify(tracks, null, 2);

const isTrackArray = (v: unknown): v is Track[] =>
  Array.isArray(v) && v.every((t) => t && typeof t.url === "string");

const SpotifyApp = () => {
  const [playlistText, setPlaylistText] = usePersistentState(
    "spotify-playlist-text",
    () => serialize(DEFAULT_PLAYLIST),
  );
  const [queue, setQueue] = usePersistentState<Track[]>(
    "spotify-queue",
    () => DEFAULT_PLAYLIST,
    isTrackArray,
  );
  const [recent, setRecent] = usePersistentState<Track[]>(
    "spotify-recent",
    [],
    isTrackArray,
  );
  const [current, setCurrent] = usePersistentState<number>(
    "spotify-current-index",
    0,
    (v): v is number => typeof v === "number",
  );
  const [mini, setMini] = usePersistentState(
    "spotify-mini",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [crossfade, setCrossfade] = usePersistentState<number>(
    "spotify-crossfade",
    0,
    (v): v is number => typeof v === "number",
  );
  const [gapless, setGapless] = usePersistentState(
    "spotify-gapless",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const playerRef = useRef<CrossfadePlayer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadPlaylist = () => {
    try {
      const parsed = JSON.parse(playlistText);
      if (isTrackArray(parsed)) {
        setQueue(parsed);
        setPlaylistText(serialize(parsed));
        setCurrent(0);
      }
    } catch {
      // ignore invalid JSON
    }
  };

  useEffect(() => {
    if (!queue.length) loadPlaylist();
    const player = new CrossfadePlayer();
    playerRef.current = player;
    setAnalyser(player.getAnalyser());
    return () => player.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const track = queue[current];
    if (!track) return;
    setRecent((r) =>
      [track, ...r.filter((t) => t.url !== track.url)].slice(0, 10),
    );
    playerRef.current
      ?.play(track.url, crossfade)
      .then(() => {
        setDuration(playerRef.current?.getDuration() ?? 0);
        setProgress(0);
      });
  }, [current, queue, setRecent, crossfade]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setProgress(playerRef.current?.getCurrentTime() ?? 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const next = () => {
    if (!queue.length) return;
    setCurrent((i) => (i + 1) % queue.length);
  };

  const previous = () => {
    if (!queue.length) return;
    setCurrent((i) => (i - 1 + queue.length) % queue.length);
  };

  const togglePlay = () => playerRef.current?.toggle();

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.code === "MediaTrackNext") {
      e.preventDefault();
      next();
    } else if (e.code === "MediaTrackPrevious") {
      e.preventDefault();
      previous();
    } else if (e.code === "MediaPlayPause") {
      e.preventDefault();
      togglePlay();
    }
  };

  const currentTrack = queue[current];

  const controlButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-full border border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] shadow-sm shadow-kali-panel transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)] hover:bg-[color:color-mix(in_srgb,var(--kali-control)_18%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      className={`h-full w-full bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col gap-4 ${
        mini ? "p-2" : "p-5"
      }`}
      tabIndex={0}
      onKeyDown={handleKey}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={previous}
            title="Previous"
            disabled={!queue.length}
            className={controlButtonClass}
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            title="Play/Pause"
            disabled={!queue.length}
            className={`${controlButtonClass} text-lg`}
          >
            ⏯
          </button>
          <button
            onClick={next}
            title="Next"
            disabled={!queue.length}
            className={controlButtonClass}
          >
            ⏭
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <label className="flex items-center gap-2 rounded-full border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-3 py-1.5 shadow-kali-panel">
            <span className="font-medium uppercase tracking-wider text-[0.65rem] sm:text-xs text-slate-200/80">
              Crossfade
            </span>
            <input
              type="range"
              min={0}
              max={12}
              value={crossfade}
              onChange={(e) => setCrossfade(Number(e.target.value))}
              className="accent-kali-control"
              aria-label="Crossfade duration"
            />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-3 py-1.5 shadow-kali-panel">
            <input
              type="checkbox"
              checked={gapless}
              onChange={(e) => setGapless(e.target.checked)}
              className="h-4 w-4 accent-kali-control"
              aria-label="Toggle gapless playback"
            />
            <span className="font-medium uppercase tracking-wider text-[0.65rem] sm:text-xs text-slate-200/80">
              Gapless
            </span>
          </label>
          <button
            onClick={() => setMini(!mini)}
            className="rounded-full border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-200/80 transition hover:border-[color:var(--kali-control)] hover:text-[color:var(--kali-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
          >
            {mini ? "Full" : "Mini"}
          </button>
        </div>
      </header>
      {duration > 0 && (
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration}
            value={progress}
            onChange={(e) => {
              const t = Number(e.target.value);
              playerRef.current?.seek(t);
              setProgress(t);
            }}
            className="w-full accent-kali-control"
            disabled={!queue.length}
            aria-label="Track progress"
          />
          <div className="flex justify-between text-[0.65rem] uppercase tracking-widest text-slate-300/60">
            <span>{Math.floor(progress)}s</span>
            <span>{Math.floor(duration)}s</span>
          </div>
        </div>
      )}
      <div
        className={`flex-1 flex flex-col gap-4 ${
          mini ? "" : "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start"
        }`}
      >
        {currentTrack && (
          <section className="relative overflow-hidden rounded-3xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 shadow-lg shadow-kali-panel">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-[color:var(--kali-border)] shadow-inner shadow-kali-panel">
                {currentTrack.cover ? (
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:color-mix(in_srgb,var(--kali-control)_35%,transparent)] via-transparent to-slate-900/60" />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <span className="block text-[0.65rem] uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-control)_75%,var(--kali-text))]">
                    Now Playing
                  </span>
                  <p className="mt-1 text-2xl font-semibold text-slate-50">
                    {currentTrack.title}
                  </p>
                </div>
                {analyser && (
                  <div className="rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3">
                    <Visualizer analyser={analyser} />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3">
              <Lyrics title={currentTrack.title} player={playerRef.current} />
            </div>
          </section>
        )}
        {!mini && (
          <section className="flex flex-col gap-4">
            <div className="grid gap-4 rounded-3xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 shadow-inner shadow-kali-panel md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                  Playlist JSON
                </h2>
                <textarea
                  className="h-40 w-full rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
                  value={playlistText}
                  onChange={(e) => setPlaylistText(e.target.value)}
                  aria-label="Playlist JSON editor"
                />
                <button
                  onClick={loadPlaylist}
                  className="self-start rounded-full border border-[color:var(--kali-border)] bg-kali-control px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-kali-control/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
                >
                  Load Playlist
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                  Queue
                </h2>
                <ul className="max-h-52 overflow-auto rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-2">
                  {queue.map((t, i) => (
                    <li key={t.url}>
                      <button
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)] ${
                          i === current
                            ? "border border-[color:var(--kali-control)] bg-kali-control/20 text-slate-50 shadow shadow-kali-panel"
                            : "border border-transparent bg-white/5 text-slate-100/80 hover:border-[color:var(--kali-border)] hover:bg-[color:color-mix(in_srgb,var(--kali-control)_12%,var(--kali-panel))]"
                        }`}
                        onClick={() => setCurrent(i)}
                      >
                        <span
                          className={`h-2 w-2 rounded-full transition ${
                            i === current
                              ? "bg-kali-control shadow shadow-kali-panel"
                              : "bg-slate-500/60 group-hover:bg-kali-control"
                          }`}
                        />
                        <span className="truncate">{t.title || t.url}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-3xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 shadow-inner shadow-kali-panel">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                Recently Played
              </h2>
              <ul className="mt-3 max-h-60 space-y-2 overflow-auto">
                {recent.map((t) => (
                  <li
                    key={t.url}
                    className="rounded-2xl border border-transparent bg-white/5 px-3 py-2 text-sm text-slate-100/80 transition hover:border-[color:var(--kali-control)] hover:bg-kali-control/10"
                  >
                    {t.title || t.url}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SpotifyApp;
