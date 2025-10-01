"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface CaptionTrackConfig {
  src: string;
  label: string;
  srclang?: string;
  kind?: TextTrackKind;
  default?: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  tracks?: CaptionTrackConfig[];
  videoId?: string;
}

interface CaptionTrackOption {
  index: number;
  label: string;
  language?: string;
}

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
  tracks,
  videoId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { open, close } = usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [captionTracks, setCaptionTracks] = useState<CaptionTrackOption[]>([]);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(0);
  const captionButtonId = useId();
  const captionsMenuId = `${captionButtonId}-menu`;
  const captionsButtonRef = useRef<HTMLButtonElement>(null);
  const captionsMenuRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const storageKey = videoId ? `video-caption-${videoId}` : null;

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

  const applyTrackSelection = useCallback(
    (index: number | null, { persist } = { persist: true }) => {
      const video = videoRef.current;
      if (!video) return;
      const trackList = video.textTracks;
      if (!trackList) return;

      Array.from(trackList).forEach((track, trackIndex) => {
        const isActive = index === trackIndex;
        track.mode = isActive ? "showing" : "disabled";
      });
      setActiveTrackIndex(index);

      if (!persist || !storageKey) return;
      const storage = getStorage();
      if (!storage) return;

      if (index === null) {
        storage.setItem(storageKey, "off");
      } else {
        storage.setItem(storageKey, `${index}`);
      }
    },
    [storageKey]
  );

  const updateCaptionTracks = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      setCaptionTracks([]);
      setActiveTrackIndex(null);
      return;
    }

    const trackList = video.textTracks;
    if (!trackList || trackList.length === 0) {
      setCaptionTracks([]);
      setActiveTrackIndex(null);
      return;
    }

    const list = Array.from(trackList).map((track, index) => ({
      index,
      label: track.label || track.language || `Track ${index + 1}`,
      language: track.language || undefined,
    }));
    setCaptionTracks(list);

    const storage = storageKey ? getStorage() : null;
    let preferredIndex: number | null = null;
    let hasStoredPreference = false;
    if (storage && storageKey) {
      const stored = storage.getItem(storageKey);
      if (stored === "off") {
        preferredIndex = null;
        hasStoredPreference = true;
      } else if (stored !== null) {
        const parsed = Number.parseInt(stored, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed < list.length) {
          preferredIndex = parsed;
          hasStoredPreference = true;
        }
      }
    }

    if (hasStoredPreference) {
      applyTrackSelection(preferredIndex, { persist: false });
      return;
    }

    const showingIndex = Array.from(trackList).findIndex(
      (track) => track.mode === "showing"
    );

    if (showingIndex >= 0) {
      setActiveTrackIndex(showingIndex);
    } else {
      setActiveTrackIndex(null);
    }
  }, [applyTrackSelection, storageKey]);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    updateCaptionTracks();

    const handleLoadedMetadata = () => updateCaptionTracks();
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    const trackList = video.textTracks as any;
    const events = ["addtrack", "removetrack", "change"] as const;
    events.forEach((eventName) => {
      if (trackList && typeof trackList.addEventListener === "function") {
        trackList.addEventListener(eventName, updateCaptionTracks);
      }
    });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      events.forEach((eventName) => {
        if (trackList && typeof trackList.removeEventListener === "function") {
          trackList.removeEventListener(eventName, updateCaptionTracks);
        }
      });
    };
  }, [updateCaptionTracks, tracks]);

  const captionsAvailable = captionTracks.length > 0;
  const totalMenuItems = captionTracks.length + 1;
  menuItemRefs.current = [];

  useEffect(() => {
    if (!isMenuOpen || totalMenuItems === 0) return;

    const initialIndex = activeTrackIndex !== null ? activeTrackIndex + 1 : 0;
    setFocusedMenuIndex(initialIndex);
  }, [isMenuOpen, activeTrackIndex, totalMenuItems]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const node = menuItemRefs.current[focusedMenuIndex];
    node?.focus();
  }, [focusedMenuIndex, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        !captionsMenuRef.current?.contains(target) &&
        !captionsButtonRef.current?.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isMenuOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isMenuOpen || totalMenuItems === 0) return;
    switch (event.key) {
      case "ArrowDown":
      case "Down":
        event.preventDefault();
        setFocusedMenuIndex((prev) => (prev + 1) % totalMenuItems);
        break;
      case "ArrowUp":
      case "Up":
        event.preventDefault();
        setFocusedMenuIndex((prev) =>
          (prev - 1 + totalMenuItems) % totalMenuItems
        );
        break;
      case "Home":
        event.preventDefault();
        setFocusedMenuIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedMenuIndex(totalMenuItems - 1);
        break;
      case "Escape":
        event.preventDefault();
        setIsMenuOpen(false);
        captionsButtonRef.current?.focus();
        break;
      case "Tab":
        setIsMenuOpen(false);
        break;
      default:
    }
  };

  const selectTrack = (index: number | null) => {
    applyTrackSelection(index);
    setIsMenuOpen(false);
    captionsButtonRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <video ref={videoRef} src={src} poster={poster} controls className="w-full h-auto">
        {tracks?.map((track) => (
          <track
            key={`${track.srclang ?? track.src}-${track.label}`}
            src={track.src}
            label={track.label}
            kind={track.kind ?? "subtitles"}
            srcLang={track.srclang}
            default={track.default}
          />
        ))}
      </video>
      {captionsAvailable && (
        <div className="absolute bottom-2 left-2" ref={captionsMenuRef}>
          <button
            type="button"
            id={captionButtonId}
            ref={captionsButtonRef}
            aria-haspopup="menu"
            aria-controls={captionsMenuId}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((openState) => !openState)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setIsMenuOpen(true);
              }
            }}
            className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            Captions
          </button>
          {isMenuOpen && (
            <div
              role="menu"
              id={captionsMenuId}
              aria-labelledby={captionButtonId}
              onKeyDown={handleMenuKeyDown}
              className="mt-2 w-40 rounded bg-black bg-opacity-80 p-1 text-left text-xs text-white shadow-lg"
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeTrackIndex === null}
                className="flex w-full cursor-pointer items-center rounded px-2 py-1 text-left hover:bg-white hover:bg-opacity-10 focus:bg-white focus:bg-opacity-20"
                onClick={() => selectTrack(null)}
                ref={(element) => {
                  menuItemRefs.current[0] = element;
                }}
                tabIndex={-1}
              >
                Off
              </button>
              {captionTracks.map(({ label, index }) => (
                <button
                  key={index}
                  type="button"
                  role="menuitemradio"
                  aria-checked={activeTrackIndex === index}
                  className="flex w-full cursor-pointer items-center rounded px-2 py-1 text-left hover:bg-white hover:bg-opacity-10 focus:bg-white focus:bg-opacity-20"
                  onClick={() => selectTrack(index)}
                  ref={(element) => {
                    menuItemRefs.current[index + 1] = element;
                  }}
                  tabIndex={-1}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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

