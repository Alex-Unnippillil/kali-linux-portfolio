"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useFnd03Dynamic } from "../../hooks/useFnd03Dynamic";

type PipPortalModule = typeof import("../common/PipPortal");

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const floored = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(floored / 60);
  const secs = floored % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

interface EnhancedControlsProps {
  module: PipPortalModule;
  videoRef: React.RefObject<HTMLVideoElement>;
  announce: (message: string) => void;
}

const EnhancedControls: React.FC<EnhancedControlsProps> = ({
  module,
  videoRef,
  announce,
}) => {
  const { open, close } = module.usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const pipEnabled =
      typeof document !== "undefined" &&
      !!document.pictureInPictureEnabled &&
      typeof video.requestPictureInPicture === "function";
    setPipSupported(pipEnabled);

    const docSupported =
      typeof window !== "undefined" &&
      "documentPictureInPicture" in window;
    setDocPipSupported(docSupported);

    const handleLeave = () => {
      setIsPip(false);
      announce("Exited Picture-in-Picture.");
    };
    const handleEnd = () => {
      close();
      setIsPip(false);
    };

    video.addEventListener("leavepictureinpicture", handleLeave);
    video.addEventListener("ended", handleEnd);

    return () => {
      video.removeEventListener("leavepictureinpicture", handleLeave);
      video.removeEventListener("ended", handleEnd);
    };
  }, [videoRef, close, announce]);

  useEffect(() => {
    if (!docPipSupported) return;

    const handler = (event: MessageEvent) => {
      if (!videoRef.current || event.data?.source !== "doc-pip") return;
      const video = videoRef.current;
      switch (event.data.type) {
        case "toggle":
          if (video.paused) {
            void video.play();
          } else {
            video.pause();
          }
          break;
        case "seek": {
          const delta = Number(event.data.delta || 0);
          const duration = video.duration || 0;
          const nextTime = Math.max(
            0,
            Math.min(duration || Number.POSITIVE_INFINITY, video.currentTime + delta),
          );
          video.currentTime = nextTime;
          announce(`Seeked to ${formatTime(nextTime)}.`);
          break;
        }
        case "volume": {
          const volume = Math.max(0, Math.min(1, Number(event.data.value)));
          video.volume = volume;
          announce(`Volume ${Math.round(volume * 100)} percent.`);
          break;
        }
        default:
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [docPipSupported, videoRef, announce]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video || !pipSupported) return;

    try {
      if (!document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        setIsPip(true);
        announce("Entered Picture-in-Picture.");
      } else {
        await document.exitPictureInPicture();
        setIsPip(false);
        announce("Exited Picture-in-Picture.");
      }
    } catch (error) {
      console.error("Unable to toggle Picture-in-Picture", error);
      setIsPip(false);
      announce("Picture-in-Picture is unavailable.");
    }
  };

  const openDocPip = async () => {
    if (!docPipSupported) return;

    const initialVolume = videoRef.current?.volume ?? 1;

    const DocPipControls: React.FC<{ initialVolume: number }> = ({ initialVolume }) => {
      const [vol, setVol] = useState(initialVolume);
      const sliderId = useId();
      const send = (msg: Record<string, unknown>) => {
        window.opener?.postMessage({ source: "doc-pip", ...msg }, "*");
      };

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
          <button
            type="button"
            onClick={() => send({ type: "toggle" })}
            aria-label="Toggle playback"
          >
            Play/Pause
          </button>
          <button
            type="button"
            onClick={() => send({ type: "seek", delta: -5 })}
            aria-label="Seek backward five seconds"
          >
            -5s
          </button>
          <button
            type="button"
            onClick={() => send({ type: "seek", delta: 5 })}
            aria-label="Seek forward five seconds"
          >
            +5s
          </button>
          <label htmlFor={sliderId} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Volume
            <input
              id={sliderId}
              aria-label="Volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(event) => {
                const value = parseFloat(event.target.value);
                setVol(value);
                send({ type: "volume", value });
              }}
            />
          </label>
        </div>
      );
    };

    await open(<DocPipControls initialVolume={initialVolume} />);
    announce("Document Picture-in-Picture opened.");
  };

  if (!pipSupported && !docPipSupported) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 flex gap-2">
      {pipSupported && (
        <button
          type="button"
          onClick={togglePiP}
          className="pointer-events-auto rounded bg-black bg-opacity-70 px-2 py-1 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-pressed={isPip}
          aria-label={isPip ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture"}
        >
          {isPip ? "Exit PiP" : "PiP"}
        </button>
      )}
      {docPipSupported && (
        <button
          type="button"
          onClick={openDocPip}
          className="pointer-events-auto rounded bg-black bg-opacity-70 px-2 py-1 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Open Document Picture-in-Picture controls"
        >
          Doc-PiP
        </button>
      )}
    </div>
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isIntersecting, setIntersecting] = useState(false);
  const [isDocumentVisible, setDocumentVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const autoPauseReasonRef = useRef<"hidden" | "offscreen" | null>(null);
  const announceTimeout = useRef<number>();

  const announce = useCallback((message: string) => {
    if (typeof window !== "undefined" && announceTimeout.current) {
      window.clearTimeout(announceTimeout.current);
    }
    setAnnouncement("");
    if (typeof window !== "undefined") {
      announceTimeout.current = window.setTimeout(() => {
        setAnnouncement(message);
      }, 32);
    } else {
      setAnnouncement(message);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && announceTimeout.current) {
        window.clearTimeout(announceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, { threshold: 0.25 });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibility = () => {
      setDocumentVisible(document.visibilityState !== "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if ((!isIntersecting || !isDocumentVisible) && !video.paused) {
      const reason = !isDocumentVisible ? "hidden" : "offscreen";
      autoPauseReasonRef.current = reason;
      video.pause();
      announce(
        reason === "hidden"
          ? "Video paused because the tab is hidden."
          : "Video paused because it left the viewport.",
      );
    }

    if (isIntersecting && isDocumentVisible) {
      autoPauseReasonRef.current = null;
    }
  }, [isIntersecting, isDocumentVisible, announce]);

  const shouldEnhance = isIntersecting || hasInteracted;
  const loadPipModule = useCallback(() => import("../common/PipPortal"), []);
  const pipModule = useFnd03Dynamic<PipPortalModule>(loadPipModule, shouldEnhance);

  const PortalProvider = useMemo(() => {
    if (pipModule?.default) {
      return pipModule.default as React.ComponentType<React.PropsWithChildren<unknown>>;
    }
    return Fragment;
  }, [pipModule]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    autoPauseReasonRef.current = null;
    setHasInteracted(true);

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          announce("Unable to play the video.");
        });
      }
    } else {
      video.pause();
    }
  }, [announce]);

  const seek = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      setHasInteracted(true);
      const duration = video.duration || Number.POSITIVE_INFINITY;
      const nextTime = Math.max(0, Math.min(duration, video.currentTime + delta));
      video.currentTime = nextTime;
      announce(`Seeked to ${formatTime(nextTime)}.`);
    },
    [announce],
  );

  const adjustVolume = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      setHasInteracted(true);
      const nextVolume = Math.max(0, Math.min(1, video.volume + delta));
      video.volume = nextVolume;
      if (video.muted && nextVolume > 0) {
        video.muted = false;
      }
      announce(`Volume ${Math.round(nextVolume * 100)} percent.`);
    },
    [announce],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setHasInteracted(true);
    video.muted = !video.muted;
    announce(video.muted ? "Muted." : `Volume ${Math.round(video.volume * 100)} percent.`);
  }, [announce]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case " ":
      case "Spacebar":
      case "k":
      case "K":
      case "p":
      case "P":
        event.preventDefault();
        togglePlayback();
        break;
      case "m":
      case "M":
        event.preventDefault();
        toggleMute();
        break;
      case "ArrowLeft":
        event.preventDefault();
        seek(-5);
        break;
      case "ArrowRight":
        event.preventDefault();
        seek(5);
        break;
      case "ArrowUp":
        event.preventDefault();
        adjustVolume(0.05);
        break;
      case "ArrowDown":
        event.preventDefault();
        adjustVolume(-0.05);
        break;
      default:
    }
  };

  const handlePlay = () => {
    autoPauseReasonRef.current = null;
    setHasInteracted(true);
    announce("Video playing.");
  };

  const handlePause = () => {
    setHasInteracted(true);
    if (autoPauseReasonRef.current) {
      return;
    }
    announce("Video paused.");
  };

  const handleVolumeChange = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.muted && video.volume === 0) {
      video.muted = true;
    }
  };

  return (
    <PortalProvider>
      <div
        ref={containerRef}
        className={`relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`.trim()}
        tabIndex={0}
        role="group"
        aria-label="Video player"
        onKeyDown={handleKeyDown}
        onPointerDown={() => setHasInteracted(true)}
        onFocus={() => setHasInteracted(true)}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          aria-label="Video playback"
          className="h-auto w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          onPlay={handlePlay}
          onPause={handlePause}
          onVolumeChange={handleVolumeChange}
        />
        <div className="sr-only" aria-live="polite" role="status">
          {announcement}
        </div>
        {pipModule && (
          <EnhancedControls module={pipModule} videoRef={videoRef} announce={announce} />
        )}
      </div>
    </PortalProvider>
  );
};

export default VideoPlayer;

