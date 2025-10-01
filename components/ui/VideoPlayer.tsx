"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface SegmentSourceEntry {
  url: string;
  duration?: number;
}

interface SegmentManifest {
  mimeType: string;
  codecs?: string;
  initSegment?: string;
  segments: Array<string | SegmentSourceEntry>;
  live?: boolean;
}

const MIN_BUFFER_AHEAD = 12; // seconds
const MAX_BUFFER_AHEAD = 30; // seconds

const isManifest = (value: unknown): value is SegmentManifest => {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<SegmentManifest>;
  return (
    typeof manifest.mimeType === "string" &&
    Array.isArray(manifest.segments) &&
    manifest.segments.length > 0
  );
};

const normaliseSegments = (
  entries: SegmentManifest["segments"],
  baseUrl: string
): SegmentSourceEntry[] =>
  entries.map((entry) => {
    if (typeof entry === "string") {
      return { url: new URL(entry, baseUrl).toString() };
    }
    return {
      url: new URL(entry.url, baseUrl).toString(),
      duration: entry.duration,
    };
  });

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
  const [mseSupported, setMseSupported] = useState(false);
  const [isMseStream, setIsMseStream] = useState(false);
  const [bufferAhead, setBufferAhead] = useState(0);
  const [bufferRanges, setBufferRanges] = useState<number[]>([]);
  const [buffering, setBuffering] = useState(false);
  const [mseError, setMseError] = useState<string | null>(null);
  const bufferAheadRef = useRef(0);

  const bufferHealthClass = useMemo(() => {
    if (bufferAhead >= MIN_BUFFER_AHEAD) return "bg-emerald-500";
    if (bufferAhead >= MIN_BUFFER_AHEAD / 2) return "bg-amber-500";
    return "bg-rose-500";
  }, [bufferAhead]);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let mediaSource: MediaSource | null = null;
    let sourceBuffer: SourceBuffer | null = null;
    let objectUrl: string | null = null;
    let segments: SegmentSourceEntry[] = [];
    let nextSegmentIndex = 0;
    let fetchAbortController: AbortController | null = null;
    let rafId: number | null = null;
    let manifest: SegmentManifest | null = null;
    let segmentRequestInFlight = false;
    let cancelled = false;
    const pendingQueue: ArrayBuffer[] = [];

    const detach = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (video.src && objectUrl && video.src === objectUrl) {
        video.removeAttribute("src");
        video.load();
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      if (sourceBuffer && mediaSource?.readyState === "open") {
        try {
          mediaSource.removeSourceBuffer(sourceBuffer);
        } catch {
          // ignored
        }
      }
      sourceBuffer = null;
      if (fetchAbortController) {
        fetchAbortController.abort();
        fetchAbortController = null;
      }
      mediaSource?.removeEventListener("sourceopen", onSourceOpen);
      if (mediaSource && mediaSource.readyState === "open") {
        try {
          mediaSource.endOfStream();
        } catch {
          // ignored
        }
      }
      mediaSource = null;
    };

    const ensureBufferPump = () => {
      if (!sourceBuffer || sourceBuffer.updating || pendingQueue.length === 0) {
        return;
      }
      const chunk = pendingQueue.shift();
      if (chunk) {
        try {
          sourceBuffer.appendBuffer(chunk);
        } catch (err) {
          setMseError(
            err instanceof Error ? err.message : "Unable to append buffer"
          );
        }
      }
    };

    const fetchSegment = async (segmentUrl: string) => {
      if (segmentRequestInFlight) return;
      segmentRequestInFlight = true;
      setBuffering(true);
      fetchAbortController = new AbortController();
      try {
        const response = await fetch(segmentUrl, {
          signal: fetchAbortController.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch segment: ${response.status}`);
        }
        const data = await response.arrayBuffer();
        if (!cancelled) {
          pendingQueue.push(data);
          ensureBufferPump();
        }
      } finally {
        if (!cancelled) {
          setBuffering(false);
          if (fetchAbortController?.signal.aborted) {
            setMseError(null);
          }
        }
        segmentRequestInFlight = false;
        fetchAbortController = null;
      }
    };

    const appendNextSegment = async () => {
      if (segmentRequestInFlight) return;
      if (!segments.length || nextSegmentIndex >= segments.length) {
        if (mediaSource && mediaSource.readyState === "open") {
          try {
            mediaSource.endOfStream();
          } catch {
            // ignored
          }
        }
        return;
      }
      const next = segments[nextSegmentIndex];
      nextSegmentIndex += 1;
      try {
        await fetchSegment(next.url);
      } catch (err) {
        setMseError(
          err instanceof Error ? err.message : "Failed to fetch segment"
        );
      }
    };

    const updateBufferHealth = () => {
      if (!video) return;
      const { buffered, currentTime } = video;
      let ahead = 0;
      const ranges: number[] = [];
      for (let i = 0; i < buffered.length; i += 1) {
        const start = buffered.start(i);
        const end = buffered.end(i);
        ranges.push(end - start);
        if (currentTime >= start && currentTime <= end) {
          ahead = end - currentTime;
        } else if (start > currentTime && ahead === 0) {
          ahead = end - currentTime;
        }
      }
      setBufferAhead(Number.isFinite(ahead) ? ahead : 0);
      bufferAheadRef.current = Number.isFinite(ahead) ? ahead : 0;
      setBufferRanges(ranges);
      if (
        manifest?.live !== true &&
        bufferAheadRef.current < MIN_BUFFER_AHEAD &&
        nextSegmentIndex < segments.length
      ) {
        void appendNextSegment();
      }
      rafId = requestAnimationFrame(updateBufferHealth);
    };

    const onUpdateEnd = () => {
      ensureBufferPump();
      if (
        video &&
        manifest?.live !== true &&
        !sourceBuffer?.updating &&
        bufferAheadRef.current < MAX_BUFFER_AHEAD
      ) {
        void appendNextSegment();
      }
    };

    const onSourceOpen = () => {
      if (!mediaSource || !manifest) return;
      try {
        const mime = manifest.codecs
          ? `${manifest.mimeType}; codecs="${manifest.codecs}"`
          : manifest.mimeType;
        sourceBuffer = mediaSource.addSourceBuffer(mime);
      } catch (err) {
        setMseError(
          err instanceof Error ? err.message : "Unable to create source buffer"
        );
        setIsMseStream(false);
        setMseSupported(false);
        detach();
        video.src = src;
        video.load();
        return;
      }
      sourceBuffer.addEventListener("updateend", onUpdateEnd);

      const startBuffering = async () => {
        if (manifest?.initSegment) {
          try {
            await fetchSegment(new URL(manifest.initSegment, src).toString());
          } catch (err) {
            setMseError(
              err instanceof Error
                ? err.message
                : "Failed to fetch init segment"
            );
            return;
          }
        }
        nextSegmentIndex = 0;
        const initialPrefetch = Math.min(2, segments.length);
        for (let i = 0; i < initialPrefetch; i += 1) {
          await appendNextSegment();
        }
        if (!cancelled) {
          rafId = requestAnimationFrame(updateBufferHealth);
        }
      };

      void startBuffering();
    };

    const setup = async () => {
      setMseSupported("MediaSource" in window);
      setIsMseStream(false);
      setMseError(null);

      if (!("MediaSource" in window)) {
        video.src = src;
        video.load();
        return;
      }

      try {
        const lowerSrc = src.toLowerCase();
        let treatAsManifest = lowerSrc.endsWith(".json");
        try {
          const headResponse = await fetch(src, { method: "HEAD" });
          const type = headResponse.headers.get("content-type") || "";
          if (type.includes("application/json")) {
            treatAsManifest = true;
          }
        } catch {
          // ignore HEAD errors and fall back to GET detection
        }

        if (!treatAsManifest) {
          video.src = src;
          video.load();
          return;
        }

        const response = await fetch(src, { method: "GET" });
        if (!response.ok) {
          throw new Error(`Manifest request failed: ${response.status}`);
        }
        const json = await response.json();
        if (!isManifest(json)) {
          video.src = src;
          video.load();
          return;
        }

        manifest = json;
        segments = normaliseSegments(manifest.segments, src);
        nextSegmentIndex = 0;
        pendingQueue.length = 0;

        mediaSource = new MediaSource();
        objectUrl = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener("sourceopen", onSourceOpen);
        video.src = objectUrl;
        video.load();
        setIsMseStream(true);
      } catch (err) {
        setMseError(
          err instanceof Error ? err.message : "Unable to initialise stream"
        );
        video.src = src;
        video.load();
      }
    };

    void setup();

    return () => {
      cancelled = true;
      detach();
      if (sourceBuffer) {
        sourceBuffer.removeEventListener("updateend", onUpdateEnd);
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setBuffering(true);
    const handlePlaying = () => setBuffering(false);

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
    };
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
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        aria-label="Video player"
        className="w-full h-auto"
      />
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1 text-xs text-white drop-shadow">
        <div className="rounded bg-black/60 px-2 py-1">
          {isMseStream ? "Adaptive stream" : mseSupported ? "Direct stream" : "Native playback"}
        </div>
        {isMseStream && (
          <div className="flex w-40 flex-col gap-1 rounded bg-black/60 p-2">
            <div className="flex items-center justify-between">
              <span>Buffer</span>
              <span>{bufferAhead.toFixed(1)}s</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-white/20">
              <div
                className={`${bufferHealthClass} h-full transition-all`}
                style={{ width: `${Math.min(100, (bufferAhead / MAX_BUFFER_AHEAD) * 100)}%` }}
              />
            </div>
            {bufferRanges.length > 0 && (
              <div className="text-[0.6rem] text-white/70">
                Ranges: {bufferRanges.map((range, index) => `${index + 1}:${range.toFixed(1)}s`).join(" ")}
              </div>
            )}
            {buffering && <div className="text-[0.6rem] text-amber-300">Buffering…</div>}
            {mseError && (
              <div className="text-[0.6rem] text-rose-300">{mseError}</div>
            )}
          </div>
        )}
        {!mseSupported && (
          <div className="rounded bg-black/60 px-2 py-1 text-[0.6rem]">
            Media Source Extensions not supported. Falling back to native playback.
          </div>
        )}
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

