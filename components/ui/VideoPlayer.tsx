"use client";

import React, { useEffect, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "password",
  "tel",
  "url",
  "number",
]);

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
              aria-label="Adjust volume"
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

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (tagName === "TEXTAREA" || target.isContentEditable) return;
        if (tagName === "INPUT" && TEXT_INPUT_TYPES.has((target as HTMLInputElement).type))
          return;
      }

      switch (event.key) {
        case " ":
        case "Space":
        case "Spacebar":
          event.preventDefault();
          if (video.paused) video.play();
          else video.pause();
          break;
        case "ArrowLeft":
          event.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case "ArrowRight":
          event.preventDefault();
          if (Number.isFinite(video.duration)) {
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          } else {
            video.currentTime += 5;
          }
          break;
        default:
          if (event.key.toLowerCase() === "m") {
            event.preventDefault();
            video.muted = !video.muted;
          }
      }
    },
    []
  );

  return (
    <div
      className={`relative ${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400`.trim()}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="Video player"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        className="w-full h-auto"
        aria-label="Video"
      />
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

