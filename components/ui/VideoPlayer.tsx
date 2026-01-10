"use client";

import React, { useEffect, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
}

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
  ariaLabel = "Video player",
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
            aria-label="Volume"
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

  return (
    <div className={`relative ${className}`.trim()}>
      <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          aria-label={ariaLabel}
          className="absolute inset-0 h-full w-full object-contain"
        />
        {(pipSupported || docPipSupported) && (
          <div className="pointer-events-none absolute top-3 right-3 flex max-w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {pipSupported && (
              <button
                type="button"
                onClick={togglePiP}
                aria-label={isPip ? "Exit picture-in-picture" : "Start picture-in-picture"}
                className="pointer-events-auto rounded-md bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black sm:px-3 sm:py-1.5 sm:text-xs"
              >
                {isPip ? "Exit PiP" : "PiP"}
              </button>
            )}
            {docPipSupported && (
              <button
                type="button"
                onClick={openDocPip}
                aria-label="Open document picture-in-picture controls"
                className="pointer-events-auto rounded-md bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black sm:px-3 sm:py-1.5 sm:text-xs"
              >
                Doc-PiP
              </button>
            )}
          </div>
        )}
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

