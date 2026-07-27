"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";
import DelayedTooltip from "./DelayedTooltip";

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
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const lastPreviewTimeRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const { open, close } = usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<
    | {
        time: number;
        percent: number;
      }
    | null
  >(null);
  const [previewReady, setPreviewReady] = useState(false);

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

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!video) return;
      setCurrentTime(video.currentTime || 0);
    };
    const handleLoadedMetadata = () => {
      if (!video) return;
      setDuration(video.duration || 0);
      setCurrentTime(video.currentTime || 0);
    };
    const handleVolumeChange = () => {
      if (!video) return;
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video?.addEventListener("play", handlePlay);
    video?.addEventListener("pause", handlePause);
    video?.addEventListener("timeupdate", handleTimeUpdate);
    video?.addEventListener("loadedmetadata", handleLoadedMetadata);
    video?.addEventListener("volumechange", handleVolumeChange);

    handleLoadedMetadata();
    handleVolumeChange();

    return () => {
      video?.removeEventListener("leavepictureinpicture", handleLeave);
      video?.removeEventListener("ended", handleEnd);
      video?.removeEventListener("play", handlePlay);
      video?.removeEventListener("pause", handlePause);
      video?.removeEventListener("timeupdate", handleTimeUpdate);
      video?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video?.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [close]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previewVideo = document.createElement("video");
    previewVideo.src = src;
    previewVideo.preload = "auto";
    previewVideo.muted = true;
    previewVideo.playsInline = true;
    previewVideoRef.current = previewVideo;

    const handleLoaded = () => setPreviewReady(true);
    const handleSeeked = () => {
      const canvas = previewCanvasRef.current;
      const pv = previewVideoRef.current;
      if (!canvas || !pv) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sourceWidth = pv.videoWidth || 160;
      const sourceHeight = pv.videoHeight || 90;
      const aspect = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : 16 / 9;
      const targetWidth = 160;
      const targetHeight = Math.max(1, Math.round(targetWidth / aspect));
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(
        pv,
        0,
        0,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );
    };

    previewVideo.addEventListener("loadeddata", handleLoaded, { once: true });
    previewVideo.addEventListener("loadedmetadata", handleLoaded, { once: true });
    previewVideo.addEventListener("seeked", handleSeeked);

    return () => {
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      previewVideo.removeEventListener("seeked", handleSeeked);
      previewVideoRef.current = null;
      setPreviewReady(false);
    };
  }, [src]);

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
        default:
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openDocPip = async () => {
    if (!docPipSupported) return;
    const initialVolume = videoRef.current?.volume ?? 1;
    const DocPipControls: React.FC<{ initialVolume: number }> = ({ initialVolume }) => {
      const [vol, setVol] = useState(initialVolume);
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
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol}
            aria-label="Doc-PiP volume"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVol(v);
              send({ type: "volume", value: v });
            }}
          />
        </div>
      );
    };

    await open(<DocPipControls initialVolume={initialVolume} />);
  };

  const formatTime = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min((video.duration || 0) - 0.1, video.currentTime + delta));
    video.currentTime = next;
  }, []);

  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = next;
    if (video.volume > 0 && video.muted) {
      video.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      // Ignore playback errors in unsupported environments.
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      switch (event.key.toLowerCase()) {
        case "j":
          event.preventDefault();
          seekBy(-10);
          break;
        case "k":
          event.preventDefault();
          seekBy(-5);
          break;
        case "l":
          event.preventDefault();
          seekBy(10);
          break;
        case "m":
          event.preventDefault();
          toggleMute();
          break;
        case " ":
        case "spacebar":
          event.preventDefault();
          void togglePlayback();
          break;
        case "enter":
          event.preventDefault();
          void togglePlayback();
          break;
        default:
          if (event.key === "ArrowUp" || event.key === "ArrowRight") {
            event.preventDefault();
            adjustVolume(0.05);
          } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
            event.preventDefault();
            adjustVolume(-0.05);
          }
      }
    },
    [adjustVolume, seekBy, toggleMute, togglePlayback]
  );

  const schedulePreview = useCallback(
    (time: number) => {
      const pv = previewVideoRef.current;
      if (!pv || !previewReady || duration <= 0) return;
      const clamped = Math.max(0, Math.min(duration, time));
      if (
        lastPreviewTimeRef.current !== null &&
        Math.abs(lastPreviewTimeRef.current - clamped) < 0.25
      ) {
        return;
      }
      lastPreviewTimeRef.current = clamped;
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
      }
      previewTimeoutRef.current = window.setTimeout(() => {
        try {
          pv.currentTime = clamped;
        } catch {
          // Ignore if seeking fails due to unsupported codecs.
        }
      }, 60);
    },
    [duration, previewReady]
  );

  const handleProgressHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (!rect || duration <= 0) return;
      const x = event.clientX - rect.left;
      const percent = Math.min(1, Math.max(0, x / rect.width));
      const time = percent * duration;
      setHoverInfo({
        time,
        percent,
      });
      schedulePreview(time);
    },
    [duration, schedulePreview]
  );

  const handleProgressLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const seekToPercent = useCallback(
    (percent: number) => {
      const video = videoRef.current;
      if (!video || duration <= 0) return;
      const next = Math.max(0, Math.min(duration, percent * duration));
      video.currentTime = next;
    },
    [duration]
  );

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (!rect) return;
      const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      seekToPercent(percent);
    },
    [seekToPercent]
  );

  const handleProgressKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        seekBy(-5);
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        seekBy(5);
      } else if (event.key === "Home") {
        event.preventDefault();
        seekToPercent(0);
      } else if (event.key === "End") {
        event.preventDefault();
        seekToPercent(1);
      }
    },
    [duration, seekBy, seekToPercent]
  );

  const shortcutsContent = useMemo(
    () => (
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Keyboard shortcuts</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Space / Enter: Play or pause</li>
          <li>J: Skip back 10s</li>
          <li>K: Skip back 5s</li>
          <li>L: Skip forward 10s</li>
          <li>Arrow keys: Adjust volume</li>
          <li>M: Toggle mute</li>
        </ul>
      </div>
    ),
    []
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(
    () => () => {
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    },
    []
  );

  return (
    <div
      className={`relative rounded-md bg-black/60 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 ${className}`.trim()}
      tabIndex={0}
      role="group"
      aria-label="Custom video player"
      onKeyDown={handleKeyDown}
    >
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-auto rounded"
          playsInline
          aria-label="Video playback"
        />
        {hoverInfo && previewReady && (
          <div
            className="pointer-events-none absolute bottom-full mb-2 flex translate-x-[-50%] flex-col items-center text-xs"
            style={{ left: `${hoverInfo.percent * 100}%` }}
          >
            <canvas
              ref={previewCanvasRef}
              className="w-40 overflow-hidden rounded border border-white/20 bg-black"
              aria-hidden="true"
            />
            <span className="mt-1 rounded bg-black/80 px-2 py-0.5 text-[10px]">
              {formatTime(hoverInfo.time)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-xs text-white/80">
          <span>J/K/L: Skip • Arrows: Volume • M: Mute</span>
          <DelayedTooltip content={shortcutsContent}>
            {({ ref: triggerRef, onBlur, onFocus, onMouseEnter, onMouseLeave }) => (
              <button
                type="button"
                ref={(node) => triggerRef(node)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onFocus={onFocus}
                onBlur={onBlur}
                className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
              >
                Shortcuts
              </button>
            )}
          </DelayedTooltip>
        </div>

        <div className="flex items-center gap-3">
          <span className="min-w-[3ch] text-xs tabular-nums">{formatTime(currentTime)}</span>
          <div
            ref={progressBarRef}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.max(duration, 0)}
            aria-valuenow={currentTime}
            aria-label="Seek"
            tabIndex={0}
            onKeyDown={handleProgressKeyDown}
            onMouseMove={handleProgressHover}
            onMouseEnter={handleProgressHover}
            onMouseLeave={handleProgressLeave}
            onClick={handleProgressClick}
            className="relative h-2 w-full cursor-pointer rounded-full bg-white/20"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-cyan-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="min-w-[3ch] text-xs tabular-nums">{formatTime(duration)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={togglePlayback}
            className="rounded bg-white/10 px-3 py-1 font-semibold hover:bg-white/20"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => seekBy(-10)}
            className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
          >
            −10s
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
          >
            +10s
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
              aria-pressed={isMuted}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <label className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                aria-label="Volume"
                onChange={(event) => {
                  const value = Number(event.target.value);
                  const video = videoRef.current;
                  if (!video) return;
                  video.volume = value;
                  if (value > 0 && video.muted) {
                    video.muted = false;
                  }
                }}
              />
            </label>
          </div>
          {pipSupported && (
            <button
              type="button"
              onClick={togglePiP}
              className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
            >
              {isPip ? "Exit PiP" : "PiP"}
            </button>
          )}
          {docPipSupported ? (
            <button
              type="button"
              onClick={openDocPip}
              className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
            >
              Doc-PiP
            </button>
          ) : (
            <span className="text-[11px] text-white/70">
              Doc-PiP requires a browser with the Document Picture-in-Picture API
              (Chrome 115+).
            </span>
          )}
        </div>
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

