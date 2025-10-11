"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import usePersistentState from "../../../hooks/usePersistentState";
import {
  DEFAULT_PLAYLISTS,
  DEFAULT_PLAYLIST_TEXT,
  MAX_PLAYLISTS,
  PlaylistMap,
  arePlaylistsEqual,
  formatPlaylist,
  isPlaylistMap,
  validatePlaylistText,
} from "../utils/playlist";

interface MoodTunerProps {
  className?: string;
}

const MoodTuner = ({ className }: MoodTunerProps) => {
  const [playlists, setPlaylists, resetPlaylists] =
    usePersistentState<PlaylistMap>(
      "spotify-mood-playlists",
      () => DEFAULT_PLAYLISTS,
      isPlaylistMap,
    );
  const [draft, setDraft, resetDraft] = usePersistentState<string>(
    "spotify-mood-playlists-draft",
    () => DEFAULT_PLAYLIST_TEXT,
    (value): value is string => typeof value === "string",
  );
  const [mood, setMood] = usePersistentState<string>(
    "spotify-mood",
    "",
    (value): value is string => typeof value === "string",
  );
  const [mini, setMini] = usePersistentState<boolean>(
    "spotify-mood-mini",
    false,
    (value): value is boolean => typeof value === "boolean",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setDraft((prev) => {
      const formatted = formatPlaylist(playlists);
      if (prev === formatted) {
        return prev;
      }
      const parsed = validatePlaylistText(prev);
      if (parsed.playlists && arePlaylistsEqual(parsed.playlists, playlists)) {
        return formatted;
      }
      return prev;
    });
  }, [playlists, setDraft]);

  const validation = useMemo(
    () => validatePlaylistText(draft, { limit: MAX_PLAYLISTS }),
    [draft],
  );

  const canApply =
    !!validation.playlists &&
    !validation.error &&
    !arePlaylistsEqual(playlists, validation.playlists);

  const applyDraft = () => {
    if (!validation.playlists || validation.error) return;
    setPlaylists(validation.playlists);
    setDraft(formatPlaylist(validation.playlists));
  };

  const resetAll = () => {
    resetPlaylists();
    resetDraft();
    setIsPlaying(false);
  };

  const moods = useMemo(() => Object.keys(playlists), [playlists]);

  useEffect(() => {
    if (!moods.length) return;
    if (!mood || !playlists[mood]) {
      setMood(moods[0]);
    }
  }, [mood, moods, playlists, setMood]);

  const activeMood = mood && playlists[mood] ? mood : moods[0] ?? "";
  const activePlaylistId = activeMood ? playlists[activeMood] : undefined;

  const post = useCallback((cmd: string) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ command: cmd }, "*");
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((playing) => {
      post(playing ? "pause" : "play");
      return !playing;
    });
  }, [post]);

  const next = useCallback(() => post("next"), [post]);
  const previous = useCallback(() => post("previous"), [post]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.origin.includes("spotify")) return;
      const data = e.data;
      if (Array.isArray(data) && data[0] === "playback_update") {
        setIsPlaying(!data[1]?.is_paused);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (mini) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "n") {
        next();
      } else if (e.key.toLowerCase() === "p") {
        previous();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [togglePlay, next, previous, mini]);

  useEffect(() => {
    setIsPlaying(false);
  }, [activePlaylistId]);

  const sliderMax = Math.max(0, moods.length - 1);
  const sliderValue =
    activeMood && moods.length ? Math.max(0, moods.indexOf(activeMood)) : 0;

  const containerClassName = [
    "flex h-full w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]",
    className ?? "",
  ]
    .join(" ")
    .trim();

  return (
    <div className={containerClassName}>
      <div className="flex flex-col gap-3 border-b border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Mood
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeMood}
              onChange={(e) => setMood(e.target.value)}
              className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm capitalize shadow-inner"
              disabled={!moods.length}
            >
              {moods.length === 0 && <option value="">No playlists</option>}
              {moods.map((label) => (
                <option key={label} value={label} className="capitalize">
                  {label}
                </option>
              ))}
            </select>
            {moods.length > 1 && (
              <input
                type="range"
                min={0}
                max={sliderMax}
                value={sliderValue}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const nextMood = moods[idx];
                  if (nextMood) setMood(nextMood);
                }}
                className="h-1 w-40 cursor-pointer"
                aria-label="Select playlist mood"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMini((value) => !value)}
            className="rounded border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40"
            aria-expanded={!mini}
            type="button"
          >
            {mini ? "Show editor" : "Hide editor"}
          </button>
        </div>
      </div>
      <div className={`flex flex-1 flex-col gap-4 p-3 ${mini ? "" : "lg:flex-row"}`}>
        <div className={`flex flex-col rounded-lg border border-white/10 bg-black/30 shadow-inner ${mini ? "" : "lg:w-1/2"}`}>
          {activePlaylistId ? (
            <iframe
              ref={iframeRef}
              src={`https://open.spotify.com/embed/playlist/${activePlaylistId}?utm_source=generator&theme=0`}
              title={activeMood || "Spotify playlist"}
              className="w-full border-b border-white/10"
              style={{ height: mini ? 180 : 248 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          ) : (
            <div className="flex h-48 items-center justify-center border-b border-white/10 px-4 text-center text-sm text-white/60">
              Add a playlist entry to preview the Spotify embed.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 p-3">
            <button
              onClick={previous}
              title="Previous (P)"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg transition hover:border-white/40 disabled:opacity-40"
              disabled={!activePlaylistId}
              type="button"
            >
              ⏮
              <span className="sr-only">Previous (P)</span>
            </button>
            <button
              onClick={togglePlay}
              title="Play/Pause (Space)"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-xl transition hover:border-white/40 disabled:opacity-40"
              disabled={!activePlaylistId}
              type="button"
            >
              {isPlaying ? "⏸" : "▶"}
              <span className="sr-only">Play/Pause (Space)</span>
            </button>
            <button
              onClick={next}
              title="Next (N)"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg transition hover:border-white/40 disabled:opacity-40"
              disabled={!activePlaylistId}
              type="button"
            >
              ⏭
              <span className="sr-only">Next (N)</span>
            </button>
          </div>
          <p className="px-3 pb-3 text-xs text-white/60">
            Playback controls send commands to the official Spotify embed via
            <code className="mx-1 rounded bg-white/10 px-1">postMessage</code>.
          </p>
          {mini && (
            <p className="px-3 pb-4 text-xs text-white/50">
              Expand the editor to tweak playlist JSON.
            </p>
          )}
        </div>
        {!mini && (
          <div className="flex flex-1 flex-col gap-3 lg:w-1/2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  Playlist JSON
                </h2>
                <p className="text-xs text-white/50">
                  Map mood labels to Spotify playlist IDs. Up to {MAX_PLAYLISTS} entries are supported.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAll}
                  className="rounded border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40"
                  type="button"
                >
                  Reset
                </button>
                <button
                  onClick={applyDraft}
                  className="rounded bg-emerald-500/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canApply}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[12rem] flex-1 rounded border border-white/15 bg-black/50 p-2 font-mono text-xs text-white/90 shadow-inner focus:border-emerald-400 focus:outline-none"
              spellCheck={false}
              aria-invalid={validation.error ? "true" : "false"}
            />
            {validation.error ? (
              <p className="text-xs text-red-400">{validation.error}</p>
            ) : (
              validation.warnings.map((warning) => (
                <p key={warning} className="text-xs text-amber-300">
                  {warning}
                </p>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodTuner;
