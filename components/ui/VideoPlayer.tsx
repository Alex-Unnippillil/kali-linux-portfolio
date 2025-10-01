"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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
  const statusId = useId();
  const docPipId = useId();
  const [statusMessage, setStatusMessage] = useState("Picture-in-picture inactive");

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

    const handleLeave = () => {
      setIsPip(false);
      setStatusMessage("Picture-in-picture closed");
    };
    video?.addEventListener("leavepictureinpicture", handleLeave);
    const handleEnd = () => {
      close();
      setIsPip(false);
      setStatusMessage("Picture-in-picture closed");
    };
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
        setStatusMessage("Picture-in-picture activated");
      } else {
        await document.exitPictureInPicture();
        setIsPip(false);
        setStatusMessage("Picture-in-picture closed");
      }
    } catch {
      setIsPip(false);
      setStatusMessage("Picture-in-picture unavailable");
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
    setStatusMessage("Document picture-in-picture controls opened in a new window");
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        aria-label={ariaLabel}
        className="w-full h-auto"
      />
      {pipSupported && (
        <button
          type="button"
          onClick={togglePiP}
          aria-pressed={isPip}
          aria-describedby={statusId}
          aria-label={isPip ? "Exit picture-in-picture" : "Enter picture-in-picture"}
          className="absolute bottom-2 right-2 rounded bg-black bg-opacity-60 px-2 py-1 text-xs font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white hover:bg-opacity-80 motion-reduce:transition-none"
        >
          <span aria-hidden="true">{isPip ? "Exit PiP" : "PiP"}</span>
        </button>
      )}
      {docPipSupported && (
        <button
          type="button"
          onClick={openDocPip}
          aria-describedby={docPipId}
          aria-label="Open document picture-in-picture controls in a new window"
          className="absolute bottom-2 right-16 rounded bg-black bg-opacity-60 px-2 py-1 text-xs font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white hover:bg-opacity-80 motion-reduce:transition-none"
        >
          <span aria-hidden="true">Doc-PiP</span>
        </button>
      )}
      <div id={statusId} role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
      {docPipSupported && (
        <p id={docPipId} className="sr-only">
          Opens remote controls for the current video in a separate window.
        </p>
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

