"use client";

import React, { useEffect, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
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
  const { open, close } = usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [theaterMode, setTheaterMode] = usePersistentState<boolean>(
    "video-player:theater-mode",
    false,
    (value): value is boolean => typeof value === "boolean"
  );
  const [stats, setStats] = useState({ resolution: "0×0", droppedFrames: 0 });

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStats = () => {
      const video = videoRef.current;
      if (!video) return;

      const resolution =
        video.videoWidth && video.videoHeight
          ? `${video.videoWidth}×${video.videoHeight}`
          : "0×0";

      let droppedFrames = 0;
      const quality =
        typeof (video as any).getVideoPlaybackQuality === "function"
          ? (video as any).getVideoPlaybackQuality()
          : null;
      if (quality && typeof quality.droppedVideoFrames === "number") {
        droppedFrames = quality.droppedVideoFrames;
      } else {
        const fallback = (video as any).webkitDroppedFrameCount;
        if (typeof fallback === "number") {
          droppedFrames = fallback;
        }
      }

      setStats((prev) =>
        prev.resolution === resolution && prev.droppedFrames === droppedFrames
          ? prev
          : { resolution, droppedFrames }
      );
    };

    updateStats();
    const id = window.setInterval(updateStats, 1000);
    const video = videoRef.current;
    video?.addEventListener("loadedmetadata", updateStats);

    return () => {
      window.clearInterval(id);
      video?.removeEventListener("loadedmetadata", updateStats);
    };
  }, []);

  const toggleTheater = () => setTheaterMode((mode) => !mode);

  const containerClassName = [
    "relative",
    "transition-all",
    "duration-200",
    theaterMode
      ? "mx-auto w-full max-w-5xl rounded-lg bg-black/90 p-2 shadow-lg sm:p-4"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const videoClassName = [
    "w-full",
    "h-auto",
    theaterMode ? "max-h-[80vh]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const overlayButtonClass =
    "rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur transition hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <div
      className={containerClassName.trim()}
      data-testid="video-player-frame"
      data-theater-mode={theaterMode ? "on" : "off"}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        className={videoClassName.trim()}
      />
      <div
        className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur"
        data-testid="video-stats-overlay"
        role="status"
        aria-live="polite"
      >
        <div>Resolution: {stats.resolution}</div>
        <div>Dropped frames: {stats.droppedFrames}</div>
      </div>
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <button
          type="button"
          onClick={toggleTheater}
          aria-pressed={theaterMode}
          aria-label="Toggle theater mode"
          className={overlayButtonClass}
        >
          {theaterMode ? "Exit theater" : "Theater mode"}
        </button>
      </div>
      {pipSupported && (
        <button
          type="button"
          onClick={togglePiP}
          className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
        >
          {isPip ? "Exit PiP" : "PiP"}
        </button>
      )}
      {docPipSupported && (
        <button
          type="button"
          onClick={openDocPip}
          className="absolute bottom-2 right-16 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
        >
          Doc-PiP
        </button>
      )}
    </div>
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => (
  <PipPortalProvider>
    <VideoPlayerInner {...props} />
  </PipPortalProvider>
);

export default VideoPlayer;

