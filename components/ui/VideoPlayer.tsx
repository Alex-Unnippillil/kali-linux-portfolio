"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [isNarrow, setIsNarrow] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

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
    const update = () => {
      if (typeof window === "undefined") return;
      setIsNarrow(window.innerWidth < 640);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isNarrow) {
      setOverflowOpen(false);
    }
  }, [isNarrow]);

  useEffect(() => {
    if (!docPipSupported) {
      setOverflowOpen(false);
    }
  }, [docPipSupported]);

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

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          className="h-auto w-full rounded"
          aria-label="Video player"
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-lg bg-black/50 p-4 text-sm text-white shadow-md">
        {pipSupported && (
          <button
            type="button"
            onClick={togglePiP}
            className="w-full rounded-md bg-indigo-500 px-4 py-3 text-base font-medium transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {isPip ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture"}
          </button>
        )}
        {docPipSupported && (
          <div className="relative">
            {isNarrow ? (
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setOverflowOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md bg-zinc-800 px-4 py-3 text-base font-medium transition hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span>More options</span>
                  <span aria-hidden="true">⋮</span>
                </button>
                {overflowOpen && (
                  <div className="mt-2 flex flex-col gap-2 rounded-md bg-zinc-900 p-3 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setOverflowOpen(false);
                        void openDocPip();
                      }}
                      className="rounded-md bg-zinc-800 px-4 py-2 text-left text-base font-medium transition hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      Open Doc-PiP Controls
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openDocPip}
                className="w-full rounded-md bg-zinc-800 px-4 py-3 text-base font-medium transition hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Open Doc-PiP Controls
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

