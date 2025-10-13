import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toPng } from 'html-to-image';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

type PreviewCanvasProps = {
  windowId?: string | null;
  /**
   * Controls whether the component should attempt to capture a live preview.
   * When false the component renders the fallback immediately.
   */
  isActive?: boolean;
  /**
   * Optional className applied to the outer wrapper.
   */
  className?: string;
  /**
   * Desired maximum preview width in CSS pixels.
   */
  width?: number;
  /**
   * Desired maximum preview height in CSS pixels.
   */
  height?: number;
  /**
   * React node rendered when the preview is disabled or fails to capture.
   */
  fallback?: React.ReactNode;
  /**
   * Forces the component to skip DOM capture even when active.
   */
  disableCapture?: boolean;
};

type CaptureState = 'idle' | 'loading' | 'ready' | 'error';

const CAPTURE_DEBOUNCE_MS = 120;
const MAX_PIXEL_RATIO = 2;

const clampDimension = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.round(value);
};

const fitWithin = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
) => {
  if (!sourceWidth || !sourceHeight) {
    return {
      width: clampDimension(maxWidth),
      height: clampDimension(maxHeight),
    };
  }
  const widthRatio = maxWidth / sourceWidth;
  const heightRatio = maxHeight / sourceHeight;
  const ratio = Math.min(widthRatio, heightRatio, 1);
  return {
    width: clampDimension(sourceWidth * ratio),
    height: clampDimension(sourceHeight * ratio),
  };
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

const requestAnimationFrameSafe = (callback: FrameRequestCallback) => {
  if (!isBrowser()) return -1;
  return window.requestAnimationFrame(callback);
};

const cancelAnimationFrameSafe = (handle: number | null | undefined) => {
  if (!isBrowser() || handle === null || handle === undefined || handle === -1) return;
  window.cancelAnimationFrame(handle);
};

export default function PreviewCanvas({
  windowId,
  isActive = false,
  className,
  width = 260,
  height = 160,
  fallback,
  disableCapture = false,
}: PreviewCanvasProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldCapture = Boolean(
    isActive &&
      windowId &&
      !disableCapture &&
      !prefersReducedMotion &&
      isBrowser(),
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [displaySize, setDisplaySize] = useState(() => ({
    width: clampDimension(width),
    height: clampDimension(height),
  }));

  const rafHandleRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const captureInFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const observersRef = useRef<(() => void)[]>([]);
  const lastWindowIdRef = useRef<string | null>(null);
  const shouldCaptureRef = useRef(shouldCapture);

  const clearScheduledCapture = useCallback(() => {
    if (debounceTimerRef.current !== null && isBrowser()) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = null;
    if (rafHandleRef.current !== null) {
      cancelAnimationFrameSafe(rafHandleRef.current);
      rafHandleRef.current = null;
    }
  }, []);

  useEffect(() => {
    shouldCaptureRef.current = shouldCapture;
    if (!shouldCapture) {
      clearScheduledCapture();
    }
  }, [shouldCapture, clearScheduledCapture]);

  const performCapture = useCallback(async () => {
    if (!shouldCaptureRef.current || !windowId) {
      return;
    }
    const target = document.getElementById(windowId);
    if (!target) {
      setCaptureState('error');
      setPreviewUrl(null);
      return;
    }

    if (captureInFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    captureInFlightRef.current = true;
    pendingRefreshRef.current = false;

    try {
      const rect = target.getBoundingClientRect();
      const fitted = fitWithin(rect.width, rect.height, width, height);
      setDisplaySize(fitted);
      const pixelRatio = Math.min(
        MAX_PIXEL_RATIO,
        Math.max(1, window.devicePixelRatio || 1),
      );
      setCaptureState('loading');
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio,
        width: rect.width,
        height: rect.height,
      });
      if (shouldCaptureRef.current && windowId === lastWindowIdRef.current) {
        setPreviewUrl(dataUrl);
        setCaptureState('ready');
      }
    } catch (error) {
      if (shouldCaptureRef.current) {
        setPreviewUrl(null);
        setCaptureState('error');
      }
    } finally {
      captureInFlightRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        if (shouldCaptureRef.current) {
          rafHandleRef.current = requestAnimationFrameSafe(() => {
            performCapture();
          });
        }
      }
    }
  }, [height, width, windowId]);

  const scheduleCapture = useCallback(
    (immediate = false) => {
      if (!shouldCaptureRef.current) {
        return;
      }
      if (!isBrowser()) {
        return;
      }
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const trigger = () => {
        rafHandleRef.current = requestAnimationFrameSafe(() => {
          performCapture();
        });
      };
      if (immediate) {
        trigger();
      } else {
        debounceTimerRef.current = window.setTimeout(trigger, CAPTURE_DEBOUNCE_MS);
      }
    },
    [performCapture],
  );

  useEffect(() => {
    if (!isBrowser()) {
      return () => {};
    }
    if (!shouldCapture) {
      setCaptureState(windowId ? 'idle' : 'idle');
      setPreviewUrl(null);
      observersRef.current.forEach((cleanup) => cleanup());
      observersRef.current = [];
      return () => {};
    }

    lastWindowIdRef.current = windowId ?? null;
    scheduleCapture(true);

    const cleanupFns: (() => void)[] = [];
    const target = windowId ? document.getElementById(windowId) : null;
    if (target) {
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => scheduleCapture());
        resizeObserver.observe(target);
        cleanupFns.push(() => resizeObserver.disconnect());
      }
      if (typeof MutationObserver !== 'undefined') {
        const mutationObserver = new MutationObserver(() => scheduleCapture());
        mutationObserver.observe(target, {
          subtree: true,
          childList: true,
          attributes: true,
        });
        cleanupFns.push(() => mutationObserver.disconnect());
      }
    }

    const handleWorkspaceState = () => scheduleCapture();
    window.addEventListener('workspace-state', handleWorkspaceState);
    cleanupFns.push(() => window.removeEventListener('workspace-state', handleWorkspaceState));

    observersRef.current = cleanupFns;

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      observersRef.current = [];
    };
  }, [scheduleCapture, shouldCapture, windowId]);

  useEffect(() => {
    return () => {
      observersRef.current.forEach((cleanup) => cleanup());
      observersRef.current = [];
      clearScheduledCapture();
    };
  }, [clearScheduledCapture]);

  useEffect(() => {
    if (!shouldCapture) {
      setPreviewUrl(null);
      if (captureState !== 'idle') {
        setCaptureState('idle');
      }
    }
  }, [shouldCapture, captureState]);

  const content = useMemo(() => {
    if (!shouldCapture || captureState === 'error' || !previewUrl) {
      return fallback ?? (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-black/40 text-xs text-white/70">
          No preview available
        </div>
      );
    }
    return (
      <img
        src={previewUrl}
        alt=""
        className="h-full w-full rounded-md object-cover"
        draggable={false}
      />
    );
  }, [captureState, fallback, previewUrl, shouldCapture]);

  return (
    <div
      className={['overflow-hidden rounded-md border border-white/10 bg-black/60', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: `${displaySize.width}px`,
        height: `${displaySize.height}px`,
      }}
      data-preview-state={captureState}
      data-preview-active={shouldCapture ? 'true' : 'false'}
    >
      {content}
    </div>
  );
}
