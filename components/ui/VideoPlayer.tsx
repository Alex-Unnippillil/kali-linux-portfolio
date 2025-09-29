"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { open, close } = usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captionsAvailable, setCaptionsAvailable] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    setPipSupported(
      typeof document !== "undefined" &&
        !!document.pictureInPictureEnabled &&
        !!video &&
        typeof video.requestPictureInPicture === "function"
    );
    setDocPipSupported(
      typeof window !== "undefined" &&
        !!(window as any).documentPictureInPicture
    );

    const handleLeave = () => setIsPip(false);
    video?.addEventListener("leavepictureinpicture", handleLeave);
    const handleEnd = () => close();
    video?.addEventListener("ended", handleEnd);

    return () => {
      video?.removeEventListener("leavepictureinpicture", handleLeave);
      video?.removeEventListener("ended", handleEnd);
    };
  }, [close]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updatePlayState = () => setIsPlaying(!video.paused);
    const updateTime = () => setCurrentTime(video.currentTime || 0);
    const updateDuration = () =>
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const updateCaptions = () => {
      const tracks = video.textTracks;
      const list = tracks
        ? Array.from({ length: tracks.length }, (_, idx) => tracks[idx])
        : [];
      setCaptionsAvailable(list.length > 0);
      setCaptionsEnabled(list.some((track) => track.mode === "showing"));
    };

    updatePlayState();
    updateTime();
    updateDuration();
    updateCaptions();

    const handleLoadedMetadata = () => {
      updateDuration();
      updateCaptions();
    };

    video.addEventListener("play", updatePlayState);
    video.addEventListener("pause", updatePlayState);
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", updateDuration);

    const tracks = video.textTracks;
    const handleTrackChange = () => updateCaptions();
    if (tracks && typeof tracks.addEventListener === "function") {
      tracks.addEventListener("change", handleTrackChange);
    }

    return () => {
      video.removeEventListener("play", updatePlayState);
      video.removeEventListener("pause", updatePlayState);
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", updateDuration);
      if (tracks && typeof tracks.removeEventListener === "function") {
        tracks.removeEventListener("change", handleTrackChange);
      }
    };
  }, []);

  const safeDuration = useMemo(() => {
    if (Number.isFinite(duration) && duration > 0) return duration;
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      return video.duration;
    }
    return currentTime > 0 ? currentTime : 0;
  }, [currentTime, duration]);

  const sliderMax = useMemo(
    () => Math.max(safeDuration, currentTime, 1),
    [currentTime, safeDuration],
  );

  const clampTime = useCallback(
    (time: number) => {
      const video = videoRef.current;
      const fallbackMax = Math.max(safeDuration, currentTime, time, 0);
      const max =
        video && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : fallbackMax;
      return Math.min(Math.max(time, 0), max);
    },
    [currentTime, safeDuration],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const handleSeekRelative = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clampTime(video.currentTime + delta);
      video.currentTime = next;
      setCurrentTime(next);
    },
    [clampTime],
  );

  const handleSeekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clampTime(time);
      video.currentTime = next;
      setCurrentTime(next);
    },
    [clampTime],
  );

  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;
    const shouldEnable = !captionsEnabled;
    for (let i = 0; i < video.textTracks.length; i += 1) {
      video.textTracks[i].mode = shouldEnable ? "showing" : "hidden";
    }
    setCaptionsEnabled(shouldEnable);
  }, [captionsEnabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleSeekRelative(-5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleSeekRelative(5);
      } else if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        toggleCaptions();
      }
    },
    [handleSeekRelative, toggleCaptions, togglePlay],
  );

  const formatTime = useCallback((value: number) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (!document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        setIsPip(true);
      } else {
        await document.exitPictureInPicture();
        setIsPip(false);
      }
    } catch {
      setIsPip(false);
    }
  };

  // Listen for messages from the Doc-PiP window
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!videoRef.current || e.data?.source !== "doc-pip") return;
      const video = videoRef.current;
      switch (e.data.type) {
        case "toggle":
          if (video.paused) video.play();
          else video.pause();
          break;
        case "seek":
          video.currentTime = Math.max(
            0,
            Math.min(video.duration || 0, video.currentTime + Number(e.data.delta || 0))
          );
          break;
        case "volume":
          video.volume = Math.max(0, Math.min(1, Number(e.data.value)));
          break;
        case "captions":
          toggleCaptions();
          break;
        default:
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [toggleCaptions]);

  const openDocPip = async () => {
    if (!docPipSupported) return;
    const initialVolume = videoRef.current?.volume ?? 1;
    const DocPipControls: React.FC<{
      initialVolume: number;
      initialCaptions: boolean;
      captionsAvailable: boolean;
    }> = ({ initialVolume, initialCaptions, captionsAvailable }) => {
      const [vol, setVol] = useState(initialVolume);
      const [cc, setCc] = useState(initialCaptions);
      const send = (msg: any) =>
        window.opener?.postMessage({ source: "doc-pip", ...msg }, "*");
      return (
        <div
          style={{
            padding: 8,
            background: "black",
            color: "white",
            fontFamily: "sans-serif",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button onClick={() => send({ type: "toggle" })}>Play/Pause</button>
          <button onClick={() => send({ type: "seek", delta: -5 })}>-5s</button>
          <button onClick={() => send({ type: "seek", delta: 5 })}>+5s</button>
          {captionsAvailable ? (
            <button
              onClick={() => {
                send({ type: "captions" });
                setCc((prev) => !prev);
              }}
            >
              {cc ? "Hide CC" : "Show CC"}
            </button>
          ) : null}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVol(v);
              send({ type: "volume", value: v });
            }}
            aria-label="Volume"
          />
        </div>
      );
    };

    await open(
      <DocPipControls
        initialVolume={initialVolume}
        initialCaptions={captionsEnabled}
        captionsAvailable={captionsAvailable}
      />,
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`.trim()}
      tabIndex={0}
      role="group"
      aria-label="Video player"
      onKeyDown={handleKeyDown}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-auto"
        aria-label="Video"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/70 via-black/50 to-transparent p-3 text-xs text-white sm:text-sm">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded bg-white/20 px-2 py-1"
            aria-label={isPlaying ? "Pause video (Space)" : "Play video (Space)"}
            title="Space"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => handleSeekRelative(-5)}
            className="rounded bg-white/10 px-2 py-1"
            aria-label="Rewind 5 seconds (ArrowLeft)"
            title="ArrowLeft"
          >
            -5s
          </button>
          <button
            type="button"
            onClick={() => handleSeekRelative(5)}
            className="rounded bg-white/10 px-2 py-1"
            aria-label="Forward 5 seconds (ArrowRight)"
            title="ArrowRight"
          >
            +5s
          </button>
          <div className="flex min-w-[140px] flex-1 items-center gap-2">
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={0.1}
              value={Math.min(currentTime, sliderMax)}
              onChange={(event) => handleSeekTo(Number(event.target.value))}
              aria-label="Seek timeline"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(safeDuration)}`}
              className="h-1 flex-1 accent-sky-400"
            />
            <span className="whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(safeDuration)}
            </span>
          </div>
          {captionsAvailable && (
            <button
              type="button"
              onClick={toggleCaptions}
              className="rounded bg-white/10 px-2 py-1"
              aria-label={captionsEnabled ? "Hide captions (C)" : "Show captions (C)"}
              aria-pressed={captionsEnabled}
              title="C"
            >
              {captionsEnabled ? "Hide CC" : "Show CC"}
            </button>
          )}
          {docPipSupported && (
            <button
              type="button"
              onClick={openDocPip}
              className="rounded bg-white/20 px-2 py-1"
              aria-label="Open Doc Picture-in-Picture controls"
              title="Open Doc-PiP"
            >
              Doc-PiP
            </button>
          )}
          {pipSupported && (
            <button
              type="button"
              onClick={togglePiP}
              className="rounded bg-white/20 px-2 py-1"
              aria-label={isPip ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture"}
            >
              {isPip ? "Exit PiP" : "PiP"}
            </button>
          )}
        </div>
        <p className="pointer-events-auto text-[11px] text-white/70">
          Shortcuts: Space toggles play, ArrowLeft/ArrowRight seek 5 seconds, C toggles captions.
        </p>
      </div>
    </div>
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => (
  <PipPortalProvider>
    <VideoPlayerInner {...props} />
  </PipPortalProvider>
);

export default VideoPlayer;

