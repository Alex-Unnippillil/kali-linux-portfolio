"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const CAPTION_STORAGE_KEY = "videoPlayerCaptionsEnabled";

const getCaptionTracks = (video: HTMLVideoElement) => {
  const tracks: TextTrack[] = [];
  const list = video.textTracks;
  for (let i = 0; i < list.length; i += 1) {
    const track = list[i];
    if (track.kind === "captions" || track.kind === "subtitles") {
      tracks.push(track);
    }
  }
  return tracks;
};

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
  const [hasTextTracks, setHasTextTracks] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const stored = window.localStorage.getItem(CAPTION_STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });
  const captionsEnabledRef = useRef(captionsEnabled);

  useEffect(() => {
    captionsEnabledRef.current = captionsEnabled;
  }, [captionsEnabled]);

  const applyCaptionsPreference = useCallback(
    (video: HTMLVideoElement | null, enabled: boolean) => {
      if (!video) return;
      const captionTracks = getCaptionTracks(video);
      captionTracks.forEach((track) => {
        track.mode = enabled ? "showing" : "disabled";
      });
    },
    []
  );

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

    const updateTrackAvailability = () => {
      const hasCaptions = getCaptionTracks(video).length > 0;
      setHasTextTracks(hasCaptions);
      if (hasCaptions) {
        applyCaptionsPreference(video, captionsEnabledRef.current);
      }
    };

    updateTrackAvailability();

    const onLoadedMetadata = () => updateTrackAvailability();
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    const tracks = video.textTracks as TextTrackList & {
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };

    let cleanupTracks: (() => void) | undefined;
    if (typeof tracks.addEventListener === "function") {
      const handleTrackChange = () => updateTrackAvailability();
      tracks.addEventListener("addtrack", handleTrackChange);
      tracks.addEventListener("removetrack", handleTrackChange);
      cleanupTracks = () => {
        tracks.removeEventListener?.("addtrack", handleTrackChange);
        tracks.removeEventListener?.("removetrack", handleTrackChange);
      };
    }

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      cleanupTracks?.();
    };
  }, [applyCaptionsPreference]);

  useEffect(() => {
    const video = videoRef.current;
    applyCaptionsPreference(video, captionsEnabled);
  }, [applyCaptionsPreference, captionsEnabled, hasTextTracks]);

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

  const toggleCaptions = () => {
    const next = !captionsEnabled;
    setCaptionsEnabled(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CAPTION_STORAGE_KEY, String(next));
    }
    applyCaptionsPreference(videoRef.current, next);
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
            aria-label="Adjust volume"
          />
        </div>
      );
    };

    await open(<DocPipControls initialVolume={initialVolume} />);
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        className="w-full h-auto"
        aria-label="Video player"
      />
      {(pipSupported || docPipSupported || hasTextTracks) && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          {hasTextTracks && (
            <button
              type="button"
              onClick={toggleCaptions}
              className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
              aria-pressed={captionsEnabled}
              aria-label={captionsEnabled ? "Disable captions" : "Enable captions"}
            >
              {captionsEnabled ? "CC On" : "CC Off"}
            </button>
          )}
          {docPipSupported && (
            <button
              type="button"
              onClick={openDocPip}
              className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
            >
              Doc-PiP
            </button>
          )}
          {pipSupported && (
            <button
              type="button"
              onClick={togglePiP}
              className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
            >
              {isPip ? "Exit PiP" : "PiP"}
            </button>
          )}
        </div>
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

