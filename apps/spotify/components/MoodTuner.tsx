import { useCallback, useEffect, useRef, useState } from "react";
import usePersistentState from "../../../hooks/usePersistentState";

interface Playlists {
  [mood: string]: string;
}

const MoodTuner = () => {
  const [playlists, setPlaylists] = useState<Playlists>({});
  const [mood, setMood] = usePersistentState<string>("spotify-mood", "");
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load playlists from public JSON
  useEffect(() => {
    fetch("/spotify-playlists.json")
      .then((res) => res.json())
      .then((data: Playlists) => {
        setPlaylists(data);
        const moods = Object.keys(data);
        if (!mood && moods.length) {
          setMood(moods[0]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure selected mood exists after playlists load
  useEffect(() => {
    const moods = Object.keys(playlists);
    if (moods.length && !playlists[mood]) {
      setMood(moods[0]);
    }
  }, [playlists, mood, setMood]);

  const post = useCallback((cmd: string) => {
    iframeRef.current?.contentWindow?.postMessage({ command: cmd }, "*");
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((playing) => {
      post(playing ? "pause" : "play");
      return !playing;
    });
  }, [post]);

  const next = useCallback(() => post("next"), [post]);
  const previous = useCallback(() => post("previous"), [post]);

  // Update play state from Spotify messages
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

  // Hotkeys
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
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
  }, [togglePlay, next, previous]);

  const moods = Object.keys(playlists);
  const index = moods.indexOf(mood);

  return (
    <div
      className="h-full w-full text-[var(--color-text)] flex flex-col"
      style={{
        backgroundColor: "var(--color-bg-base)",
        backgroundImage: "var(--color-bg)",
      }}
    >
      <div className="p-2 flex items-center gap-2 bg-black bg-opacity-30">
        <input
          type="range"
          min={0}
          max={Math.max(0, moods.length - 1)}
          value={index >= 0 ? index : 0}
          onChange={(e) => setMood(moods[Number(e.target.value)])}
          className="flex-1"
        />
        <span className="capitalize min-w-[4rem] text-center">{mood}</span>
      </div>
      {mood && playlists[mood] && (
        <>
          <iframe
            ref={iframeRef}
            src={`https://open.spotify.com/embed/playlist/${playlists[mood]}?utm_source=generator&theme=0`}
            title={mood}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <div className="flex justify-center space-x-4 p-2 bg-black bg-opacity-30">
            <button
              onClick={previous}
              title="Prev (P)"
              className="w-8 h-8 flex items-center justify-center"
            >
              ⏮<span className="sr-only">(P)</span>
            </button>
            <button
              onClick={togglePlay}
              title="Play/Pause (Space)"
              className="w-8 h-8 flex items-center justify-center"
            >
              {isPlaying ? "⏸" : "▶"}
              <span className="sr-only">(Space)</span>
            </button>
            <button
              onClick={next}
              title="Next (N)"
              className="w-8 h-8 flex items-center justify-center"
            >
              ⏭<span className="sr-only">(N)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MoodTuner;
