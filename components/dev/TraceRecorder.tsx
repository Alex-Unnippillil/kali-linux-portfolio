"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type TraceEventKind = "performance" | "error" | "unhandledrejection" | "note";

interface TraceEvent {
  id: string;
  timestamp: string;
  relativeTime: number;
  type: TraceEventKind;
  details: Record<string, unknown>;
}

interface TraceSessionMetadata {
  sessionId: string;
  sanitized: boolean;
  startedAt: string;
  stoppedAt?: string;
  durationMs?: number;
  timezone?: string;
  locale?: string;
  environment?: {
    platform?: string;
    deviceCategory?: DeviceCategory;
    viewport?: { width: number; height: number };
    hardwareConcurrency?: number | null;
    deviceMemory?: number | null;
    userAgent?: string;
  };
}

type StopReason =
  | "user"
  | "size-limit"
  | "time-limit"
  | "unsupported"
  | "error";

const MAX_CAPTURE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_CAPTURE_WINDOW_MS = 30_000; // 30 seconds
const OBSERVER_ENTRY_TYPES = [
  "navigation",
  "resource",
  "paint",
  "longtask",
  "mark",
  "measure",
] as const;

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const IP_REGEX = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const ID_REGEX = /\b\d{5,}\b/g;

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `trace-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "0.0s";
  const seconds = Math.floor(ms / 1000);
  const fractional = Math.floor((ms % 1000) / 100);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${fractional}s`;
  }
  return `${remainingSeconds}.${fractional}s`;
}

function scrubText(text: string) {
  return text
    .replace(EMAIL_REGEX, "[redacted-email]")
    .replace(IP_REGEX, "[redacted-ip]")
    .replace(ID_REGEX, (match) => (match.length > 4 ? "[redacted-number]" : match));
}

function sanitizeUrl(input: string, sanitize: boolean) {
  if (!input) return input;
  if (!sanitize) return input;
  if (input.startsWith("data:")) return "data:[redacted]";
  try {
    const url = new URL(
      input,
      typeof window !== "undefined" ? window.location.origin : "https://example.invalid",
    );
    url.search = "";
    url.hash = "";
    const cleanedPath = url.pathname
      .split("/")
      .map((segment) => scrubText(segment))
      .join("/");
    return `${url.origin}${cleanedPath}`;
  } catch {
    return scrubText(input);
  }
}

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

type DeviceCategory = "desktop" | "mobile" | "tablet" | "unknown";

function detectDeviceCategory(userAgent?: string): DeviceCategory {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

function sanitizePerformanceEntry(
  entry: PerformanceEntry,
  sanitize: boolean,
  startOffset: number,
): TraceEvent {
  const relative = Math.max(0, round(entry.startTime - startOffset));
  const details: Record<string, unknown> = {
    entryType: entry.entryType,
    startTime: relative,
    duration: round(entry.duration),
  };

  if (entry.name) {
    details.name = sanitizeUrl(entry.name, sanitize);
  }

  if ("initiatorType" in entry) {
    details.initiatorType = (entry as PerformanceResourceTiming).initiatorType;
  }

  if ("transferSize" in entry) {
    const { transferSize, encodedBodySize, decodedBodySize } =
      entry as PerformanceResourceTiming;
    if (transferSize) details.transferSize = transferSize;
    if (encodedBodySize) details.encodedBodySize = encodedBodySize;
    if (decodedBodySize) details.decodedBodySize = decodedBodySize;
  }

  if (entry.entryType === "navigation") {
    const nav = entry as PerformanceNavigationTiming;
    details.type = nav.type;
    details.domInteractive = round(nav.domInteractive);
    details.domContentLoadedEventEnd = round(nav.domContentLoadedEventEnd);
    details.loadEventEnd = round(nav.loadEventEnd);
  }

  if (entry.entryType === "longtask") {
    const longTask = entry as PerformanceLongTaskTiming;
    if (Array.isArray(longTask.attribution) && longTask.attribution.length > 0) {
      details.attribution = longTask.attribution.slice(0, 5).map((item) => ({
        name: item.name ? scrubText(item.name) : undefined,
        entryType: item.entryType,
        startTime: round(item.startTime),
        duration: round(item.duration),
      }));
    }
  }

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    relativeTime: relative,
    type: "performance",
    details,
  };
}

function toTraceViewerEvent(event: TraceEvent) {
  const baseName =
    typeof event.details.name === "string" && event.details.name.length > 0
      ? (event.details.name as string)
      : event.type;
  const entry: Record<string, unknown> = {
    name: baseName,
    cat: event.type,
    ph: event.type === "performance" ? "X" : "i",
    ts: Math.round(event.relativeTime * 1000),
    pid: 1,
    tid: event.type === "performance" ? 1 : 2,
    args: event.details,
  };
  if (event.type === "performance") {
    const duration = Number(event.details.duration ?? 0);
    entry.dur = Math.max(0, Math.round(duration * 1000));
  }
  return entry;
}

function sanitizeErrorEvent(
  message: string,
  sanitize: boolean,
  startOffset: number,
  extra: Record<string, unknown> = {},
  type: TraceEventKind = "error",
): TraceEvent {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const relative = Math.max(0, round(now - startOffset));
  const details: Record<string, unknown> = {
    message: sanitize ? scrubText(message) : message,
    ...extra,
  };

  if (sanitize) {
    Object.keys(details).forEach((key) => {
      const value = details[key];
      if (typeof value === "string") {
        details[key] = scrubText(value);
      }
    });
  }

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    relativeTime: relative,
    type,
    details,
  };
}

function buildMetadata(sanitized: boolean): TraceSessionMetadata {
  const now = new Date().toISOString();
  const sessionId = `trace-${Math.random().toString(36).slice(2, 8)}`;
  const metadata: TraceSessionMetadata = {
    sessionId,
    sanitized: sanitized,
    startedAt: now,
  };

  if (typeof window !== "undefined") {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      metadata.timezone = sanitized ? timezone?.split("/")[0] ?? undefined : timezone;
    } catch {
      /* ignore */
    }

    const locale = typeof navigator !== "undefined" ? navigator.language : undefined;
    if (locale) {
      metadata.locale = sanitized ? locale.split("-")[0] : locale;
    }

    const viewport =
      typeof window.innerWidth === "number" && typeof window.innerHeight === "number"
        ? { width: window.innerWidth, height: window.innerHeight }
        : undefined;

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
    const environment: TraceSessionMetadata["environment"] = {
      deviceCategory: detectDeviceCategory(ua),
      viewport,
    };

    if (!sanitized) {
      environment.platform = navigator.platform;
      environment.hardwareConcurrency = navigator.hardwareConcurrency ?? null;
      environment.deviceMemory = (navigator as any).deviceMemory ?? null;
      environment.userAgent = ua;
    }

    metadata.environment = environment;
  }

  return metadata;
}

export default function TraceRecorder() {
  const [metadata, setMetadata] = useState<TraceSessionMetadata | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [approxBytes, setApproxBytes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [stopReason, setStopReason] = useState<StopReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serialized, setSerialized] = useState<string | null>(null);
  const [preview, setPreview] = useState<TraceEvent[]>([]);
  const [sanitize, setSanitize] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [observerSupported, setObserverSupported] = useState(false);
  const [performanceSupported, setPerformanceSupported] = useState(false);
  const [supportedEntryTypes, setSupportedEntryTypes] = useState<string[]>([]);

  const eventsRef = useRef<TraceEvent[]>([]);
  const traceEventsRef = useRef<Record<string, unknown>[]>([]);
  const bytesRef = useRef(0);
  const metadataBytesRef = useRef(0);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startPerformanceNowRef = useRef(0);
  const metadataRef = useRef<TraceSessionMetadata | null>(null);
  const recordingRef = useRef(false);
  const stopRecordingRef = useRef<(reason: StopReason) => void>();
  const useSnapshotRef = useRef(false);
  const errorHandlerRef = useRef<((event: ErrorEvent) => void) | null>(null);
  const rejectionHandlerRef = useRef<((event: PromiseRejectionEvent) => void) | null>(null);

  useEffect(() => {
    const supportsObserver =
      typeof window !== "undefined" && typeof (window as any).PerformanceObserver === "function";
    const supportsPerformance =
      typeof performance !== "undefined" && typeof performance.getEntries === "function";

    setObserverSupported(supportsObserver);
    setPerformanceSupported(supportsPerformance);

    if (supportsObserver && typeof PerformanceObserver !== "undefined") {
      const types =
        (PerformanceObserver as unknown as { supportedEntryTypes?: string[] }).supportedEntryTypes ?? [];
      setSupportedEntryTypes(types);
    }
  }, []);

  const detachListeners = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (errorHandlerRef.current) {
      window.removeEventListener("error", errorHandlerRef.current);
      errorHandlerRef.current = null;
    }
    if (rejectionHandlerRef.current) {
      window.removeEventListener("unhandledrejection", rejectionHandlerRef.current);
      rejectionHandlerRef.current = null;
    }
  }, []);

  const addEvent = useCallback(
    (event: TraceEvent) => {
      if (!recordingRef.current) return;
      try {
        const traceEvent = toTraceViewerEvent(event);
        const size = new Blob([JSON.stringify(traceEvent)]).size;
        const nextTotal = bytesRef.current + size;
        if (nextTotal > MAX_CAPTURE_BYTES) {
          setStopReason("size-limit");
          setError("Capture stopped: size limit reached (5MB cap).");
          setTimeout(() => setError(null), 5000);
          if (stopRecordingRef.current) {
            stopRecordingRef.current("size-limit");
          }
          return;
        }
        bytesRef.current = nextTotal;
        eventsRef.current.push(event);
        traceEventsRef.current.push(traceEvent);
        setApproxBytes(nextTotal);
        setEventCount(eventsRef.current.length);
        if (eventsRef.current.length <= 20) {
          setPreview([...eventsRef.current]);
        } else {
          setPreview(eventsRef.current.slice(-20));
        }
      } catch (err) {
        console.error("Failed to append trace event", err);
      }
    },
    [],
  );

  const captureSnapshotIfNeeded = useCallback(() => {
    if (!useSnapshotRef.current || !performanceSupported) return;
    const sanitizedForSession = metadataRef.current?.sanitized ?? sanitize;
    try {
      const entries = performance.getEntries();
      entries.forEach((entry) => {
        addEvent(
          sanitizePerformanceEntry(entry, sanitizedForSession, startPerformanceNowRef.current),
        );
      });
    } catch (err) {
      console.error("Snapshot capture failed", err);
    } finally {
      useSnapshotRef.current = false;
    }
  }, [addEvent, performanceSupported, sanitize]);

  const stopRecording = useCallback(
    (reason: StopReason = "user") => {
      if (!recordingRef.current) return;
      if (reason !== "size-limit") {
        captureSnapshotIfNeeded();
      }
      recordingRef.current = false;
      detachListeners();
      setIsRecording(false);
      setStopReason(reason);

      const meta = metadataRef.current;
      if (meta) {
        const stoppedAt = new Date();
        const duration = Math.max(0, stoppedAt.getTime() - Date.parse(meta.startedAt));
        const nextMetadata: TraceSessionMetadata = {
          ...meta,
          stoppedAt: stoppedAt.toISOString(),
          durationMs: duration,
        };
        metadataRef.current = nextMetadata;
        setMetadata(nextMetadata);
      }

      setPreview(eventsRef.current.slice(-20));
      const exportPayload = {
        metadata: metadataRef.current,
        traceEvents: traceEventsRef.current,
        displayTimeUnit: "ms",
      };
      const serializedPayload = JSON.stringify(exportPayload);
      setSerialized(serializedPayload);
      setApproxBytes(new Blob([serializedPayload]).size);
      useSnapshotRef.current = false;
    },
    [captureSnapshotIfNeeded, detachListeners],
  );

  stopRecordingRef.current = stopRecording;

  const startRecording = useCallback(() => {
    setError(null);
    setShareFeedback(null);
    setSerialized(null);
    setStopReason(null);
    setEventCount(0);
    setApproxBytes(0);
    setElapsedMs(0);
    eventsRef.current = [];
    traceEventsRef.current = [];
    metadataBytesRef.current = 0;
    bytesRef.current = 0;
    setPreview([]);

    if (!performanceSupported) {
      setError("Performance APIs are not available in this environment.");
      setStopReason("unsupported");
      return;
    }

    const meta = buildMetadata(sanitize);
    metadataRef.current = meta;
    setMetadata(meta);
    metadataBytesRef.current = new Blob([JSON.stringify(meta)]).size;
    bytesRef.current = metadataBytesRef.current;
    setApproxBytes(metadataBytesRef.current);

    recordingRef.current = true;
    setIsRecording(true);
    useSnapshotRef.current = !observerSupported;

    if (typeof performance !== "undefined") {
      startPerformanceNowRef.current = performance.now();
      try {
        performance.mark(`${meta.sessionId}-start`);
        if (typeof performance.clearResourceTimings === "function") {
          performance.clearResourceTimings();
        }
      } catch {
        /* ignore */
      }
    } else {
      startPerformanceNowRef.current = Date.now();
    }

    timeoutRef.current = window.setTimeout(() => {
      setError("Capture stopped: reached 30s session limit.");
      setTimeout(() => setError(null), 5000);
      stopRecording("time-limit");
    }, MAX_CAPTURE_WINDOW_MS);

    intervalRef.current = window.setInterval(() => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      setElapsedMs(Math.max(0, now - startPerformanceNowRef.current));
    }, 500);

    const handleError = (event: ErrorEvent) => {
      const details: Record<string, unknown> = {
        filename: sanitizeUrl(event.filename || "", sanitize),
        lineno: event.lineno,
        colno: event.colno,
      };
      if (!sanitize && event.error instanceof Error && event.error.stack) {
        details.stack = event.error.stack;
      }
      addEvent(
        sanitizeErrorEvent(event.message, sanitize, startPerformanceNowRef.current, details, "error"),
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let message = "Unhandled rejection";
      if (reason instanceof Error) {
        message = reason.message;
      } else if (typeof reason === "string") {
        message = reason;
      }
      const details: Record<string, unknown> = {};
      if (!sanitize && reason instanceof Error && reason.stack) {
        details.stack = reason.stack;
      }
      addEvent(
        sanitizeErrorEvent(message, sanitize, startPerformanceNowRef.current, details, "unhandledrejection"),
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    errorHandlerRef.current = handleError;
    rejectionHandlerRef.current = handleRejection;

    if (observerSupported && typeof PerformanceObserver !== "undefined") {
      try {
        const supportedTypes = supportedEntryTypes.length
          ? supportedEntryTypes
          : OBSERVER_ENTRY_TYPES;
        const entryTypes = supportedTypes.filter((type) =>
          (OBSERVER_ENTRY_TYPES as readonly string[]).includes(type),
        );
        if (entryTypes.length > 0) {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              addEvent(sanitizePerformanceEntry(entry, sanitize, startPerformanceNowRef.current));
            });
          });
          observer.observe({ entryTypes: entryTypes as string[] });
          observerRef.current = observer;
          useSnapshotRef.current = false;
        } else {
          useSnapshotRef.current = true;
        }
      } catch (err) {
        console.error("Trace recorder observer failed", err);
        setError("Could not attach PerformanceObserver. Using snapshot on stop instead.");
        setTimeout(() => setError(null), 5000);
        observerRef.current = null;
        useSnapshotRef.current = true;
      }
    }
  }, [
    addEvent,
    observerSupported,
    performanceSupported,
    sanitize,
    stopRecording,
    supportedEntryTypes,
  ]);

  useEffect(() => () => {
    stopRecording("user");
  }, [stopRecording]);

  useEffect(() => {
    if (!isRecording) return;
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording]);

  const canShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  const handleStop = () => {
    stopRecording("user");
  };

  const handleDownload = () => {
    if (!serialized) return;
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const sessionId = metadataRef.current?.sessionId ?? "trace";
    a.download = `${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!serialized) return;
    setShareFeedback(null);
    const blob = new Blob([serialized], { type: "application/json" });
    const sessionId = metadataRef.current?.sessionId ?? "trace";

    if (canShare && navigator.canShare) {
      try {
        const file = new File([blob], `${sessionId}.json`, { type: "application/json" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Trace capture",
            text: "Captured trace session",
          });
          setShareFeedback("Shared capture via system share dialog.");
          setTimeout(() => setShareFeedback(null), 4000);
          return;
        }
      } catch (err) {
        console.error("Native share failed", err);
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(serialized);
        setShareFeedback("Copied trace JSON to clipboard.");
        setTimeout(() => setShareFeedback(null), 4000);
        return;
      } catch (err) {
        console.error("Clipboard copy failed", err);
      }
    }

    setShareFeedback("Share not supported. Use the download option instead.");
    setTimeout(() => setShareFeedback(null), 4000);
  };

  const handleClear = () => {
    detachListeners();
    recordingRef.current = false;
    eventsRef.current = [];
    bytesRef.current = 0;
    metadataRef.current = null;
    useSnapshotRef.current = false;
    setMetadata(null);
    setEventCount(0);
    setApproxBytes(0);
    setElapsedMs(0);
    setStopReason(null);
    setSerialized(null);
    setPreview([]);
    setError(null);
    setShareFeedback(null);
  };

  return (
    <div className="space-y-4 text-xs text-white">
      <div className="rounded border border-white/10 bg-[var(--kali-panel)] p-4 shadow-lg">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Trace Recorder</span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isRecording
                  ? "bg-green-500/20 text-green-300"
                  : stopReason
                  ? "bg-ub-orange/20 text-ub-orange"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {isRecording ? "Recording" : stopReason ? "Completed" : "Idle"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/70 sm:ml-auto">
            <span>Events: {eventCount}</span>
            <span>Size: {formatBytes(approxBytes)}</span>
            <span>Elapsed: {formatDuration(elapsedMs)}</span>
            <span>Session limit: 30s / 5MB</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startRecording}
            disabled={isRecording}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              isRecording
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-green-500 text-black hover:bg-green-400"
            }`}
          >
            Start capture
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={!isRecording}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              !isRecording
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-red-500 text-black hover:bg-red-400"
            }`}
          >
            Stop capture
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
          >
            Clear session
          </button>
          <div className="ml-auto flex items-center gap-2 text-[11px]">
            <input
              id="trace-recorder-sanitize"
              type="checkbox"
              checked={sanitize}
              disabled={isRecording}
              onChange={(event) => setSanitize(event.target.checked)}
              aria-label="Sanitize personal data"
              title={
                isRecording
                  ? "Stop the capture before changing sanitization settings."
                  : undefined
              }
            />
            <label htmlFor="trace-recorder-sanitize" className="cursor-pointer select-none">
              Sanitize personal data
            </label>
          </div>
        </div>
        {error && <p className="mt-3 text-[11px] text-red-300">{error}</p>}
        {shareFeedback && <p className="mt-2 text-[11px] text-ubt-grey">{shareFeedback}</p>}
        {!observerSupported && performanceSupported && (
          <p className="mt-3 text-[11px] text-ubt-grey">
            Live PerformanceObserver streaming is unavailable. Captures rely on a snapshot when you
            stop recording.
          </p>
        )}
        {!performanceSupported && (
          <p className="mt-3 text-[11px] text-red-300">
            Performance timeline APIs are not available. Tracing cannot run in this environment.
          </p>
        )}
      </div>

      {metadata && (
        <div className="rounded border border-white/10 bg-[var(--kali-panel)] p-4">
          <h3 className="text-sm font-semibold text-white">Session metadata</h3>
          <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-white/50">Session ID</dt>
              <dd className="font-mono text-[11px] text-white/80">{metadata.sessionId}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-white/50">Sanitized</dt>
              <dd className="text-[11px] text-white/80">{metadata.sanitized ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-white/50">Started</dt>
              <dd className="text-[11px] text-white/80">{metadata.startedAt}</dd>
            </div>
            {metadata.stoppedAt && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Stopped</dt>
                <dd className="text-[11px] text-white/80">{metadata.stoppedAt}</dd>
              </div>
            )}
            {metadata.durationMs !== undefined && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Duration</dt>
                <dd className="text-[11px] text-white/80">{formatDuration(metadata.durationMs)}</dd>
              </div>
            )}
            {metadata.timezone && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Timezone</dt>
                <dd className="text-[11px] text-white/80">{metadata.timezone}</dd>
              </div>
            )}
            {metadata.locale && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Locale</dt>
                <dd className="text-[11px] text-white/80">{metadata.locale}</dd>
              </div>
            )}
            {metadata.environment?.deviceCategory && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Device</dt>
                <dd className="text-[11px] text-white/80">{metadata.environment.deviceCategory}</dd>
              </div>
            )}
            {metadata.environment?.viewport && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Viewport</dt>
                <dd className="text-[11px] text-white/80">
                  {metadata.environment.viewport.width} × {metadata.environment.viewport.height}
                </dd>
              </div>
            )}
            {!metadata.sanitized && metadata.environment?.platform && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Platform</dt>
                <dd className="text-[11px] text-white/80">{metadata.environment.platform}</dd>
              </div>
            )}
            {!metadata.sanitized && metadata.environment?.hardwareConcurrency !== undefined && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Threads</dt>
                <dd className="text-[11px] text-white/80">
                  {metadata.environment.hardwareConcurrency ?? "Unknown"}
                </dd>
              </div>
            )}
            {!metadata.sanitized && metadata.environment?.deviceMemory !== undefined && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Device memory</dt>
                <dd className="text-[11px] text-white/80">
                  {metadata.environment.deviceMemory ?? "Unknown"} GB
                </dd>
              </div>
            )}
            {!metadata.sanitized && metadata.environment?.userAgent && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-white/50">User agent</dt>
                <dd className="break-words text-[11px] text-white/80">
                  {metadata.environment.userAgent}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="rounded border border-white/10 bg-[var(--kali-panel)] p-4">
        <h3 className="text-sm font-semibold text-white">Captured events</h3>
        {preview.length === 0 ? (
          <p className="mt-2 text-[11px] text-white/60">No events captured yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {preview.map((event) => (
              <li
                key={event.id}
                className="rounded border border-white/5 bg-black/20 p-2 text-[11px] text-white/80"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-white/60">
                    +{event.relativeTime.toFixed(2)}ms
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {event.type}
                  </span>
                </div>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words bg-black/20 p-2 text-[10px] leading-relaxed">
{JSON.stringify(event.details, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
        {eventCount > preview.length && (
          <p className="mt-2 text-[10px] text-white/60">
            Showing the most recent {preview.length} events of {eventCount} captured.
          </p>
        )}
      </div>

      <div className="rounded border border-white/10 bg-[var(--kali-panel)] p-4">
        <h3 className="text-sm font-semibold text-white">Export</h3>
        <p className="mt-2 text-[11px] text-white/70">
          Download or share the capture as JSON compatible with Chromium tracing viewers and custom
          tooling.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!serialized}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              !serialized
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-ub-orange text-black hover:bg-orange-400"
            }`}
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!serialized}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              !serialized
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Share capture
          </button>
          {!serialized && (
            <span className="text-[11px] text-white/50">
              Start and stop a capture to enable export options.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
