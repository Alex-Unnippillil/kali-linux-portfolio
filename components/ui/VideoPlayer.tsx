"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface VideoTrack {
  src: string;
  label: string;
  srcLang: string;
  default?: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  tracks?: VideoTrack[];
  transcript?: string;
}

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
  tracks,
  transcript,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { open, close } = usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTranscript = useMemo(() => {
    if (!transcript) return "";
    return transcript
      .split("\n")
      .filter((line) => line.toLowerCase().includes(search.toLowerCase()))
      .join("\n");
  }, [transcript, search]);

  useEffect(() => {
    const video = videoRef.current;
    setPipSupported(
      typeof document !== "undefined" &&
        !!document.pictureInPictureEnabled &&
        !!video &&
        typeof video.requestPictureInPicture === "function",
    );
    setDocPipSupported(
      typeof window !== "undefined" &&
        !!(window as any).documentPictureInPicture,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        if (video.paused) video.play();
        else video.pause();
        break;
      case "ArrowLeft":
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case "ArrowRight":
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        break;
      case "f":
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else video.requestFullscreen().catch(() => {});
        break;
      default:
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
            Math.min(
              video.duration || 0,
              video.currentTime + Number(e.data.delta || 0),
            ),
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
    const DocPipControls: React.FC<{ initialVolume: number }> = ({
      initialVolume,
    }) => {
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

  return (
    <>
      <div className={`relative ${className}`.trim()}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="w-full h-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {tracks?.map((t) => (
            <track
              key={t.src}
              kind="subtitles"
              src={t.src}
              srcLang={t.srcLang}
              label={t.label}
              default={t.default}
            />
          ))}
        </video>
        {pipSupported && (
          <button
            type="button"
            onClick={togglePiP}
            className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {isPip ? "Exit PiP" : "PiP"}
          </button>
        )}
        {docPipSupported && (
          <button
            type="button"
            onClick={openDocPip}
            className="absolute bottom-2 right-16 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Doc-PiP
          </button>
        )}
      </div>
      {transcript && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="mt-2 rounded border p-2">
              <div className="mb-2 flex gap-2">
                <input
                  type="search"
                  placeholder="Search transcript..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded border px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(filteredTranscript)
                  }
                  className="rounded bg-gray-200 px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Copy
                </button>
              </div>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm">
                {filteredTranscript}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => (
  <PipPortalProvider>
    <VideoPlayerInner {...props} />
  </PipPortalProvider>
);

export default VideoPlayer;
