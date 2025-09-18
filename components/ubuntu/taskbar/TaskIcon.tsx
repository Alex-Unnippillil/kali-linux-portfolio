"use client";

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export type TaskPreview = {
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: number;
};

export type TaskIconProps = {
  app: {
    id: string;
    title: string;
    icon: string;
  };
  focused: boolean;
  minimized: boolean;
  onActivate: () => void;
  preview?: TaskPreview | null;
  requestPreview?: (id: string, options?: { immediate?: boolean }) => Promise<TaskPreview | null | void>;
  children: ReactNode;
};

const PREVIEW_REFRESH_INTERVAL = 1200;
const HOVER_DELAY = 120;

const TaskIcon: React.FC<TaskIconProps> = ({
  app,
  focused,
  minimized,
  onActivate,
  preview,
  requestPreview,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<TaskPreview | null>(preview ?? null);
  const hoverTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!preview) {
      setLocalPreview(null);
      return;
    }
    setLocalPreview(prev => {
      if (prev && prev.dataUrl === preview.dataUrl && prev.capturedAt === preview.capturedAt) {
        return prev;
      }
      return preview;
    });
  }, [preview]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const requestAndStorePreview = useCallback(
    async (immediate: boolean) => {
      if (!requestPreview) return;
      try {
        const result = await requestPreview(app.id, { immediate });
        if (result && typeof result === 'object' && 'dataUrl' in result) {
          setLocalPreview(result as TaskPreview);
        }
      } catch (error) {
        // Swallow preview errors to avoid breaking hover interactions.
      }
    },
    [app.id, requestPreview],
  );

  useEffect(() => {
    if (!open) {
      clearRefreshTimer();
      return () => undefined;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await requestAndStorePreview(true);
      if (cancelled) return;
      clearRefreshTimer();
      refreshTimer.current = window.setTimeout(tick, PREVIEW_REFRESH_INTERVAL);
    };

    tick();

    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [open, requestAndStorePreview, clearRefreshTimer]);

  const handlePointerEnter = useCallback(() => {
    clearHoverTimer();
    if (open) return;
    hoverTimer.current = window.setTimeout(() => {
      setOpen(true);
      requestAndStorePreview(true);
    }, HOVER_DELAY);
  }, [clearHoverTimer, open, requestAndStorePreview]);

  const handlePointerLeave = useCallback(() => {
    clearHoverTimer();
    setOpen(false);
  }, [clearHoverTimer]);

  const handleFocus = useCallback(() => {
    setOpen(true);
    requestAndStorePreview(true);
  }, [requestAndStorePreview]);

  const handleBlur = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => () => {
    clearHoverTimer();
    clearRefreshTimer();
  }, [clearHoverTimer, clearRefreshTimer]);

  const buttonClassName = useMemo(() => {
    const base =
      'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white';
    const state = focused && !minimized ? ' bg-white bg-opacity-20' : '';
    return `${base}${state}`;
  }, [focused, minimized]);

  const previewDimensions = useMemo(() => {
    if (!localPreview || !localPreview.width || !localPreview.height) {
      return null;
    }
    const maxWidth = 240;
    const width = Math.min(maxWidth, Math.max(120, localPreview.width * 0.45));
    const ratio = localPreview.width ? width / localPreview.width : 1;
    const height = Math.max(90, Math.round(localPreview.height * ratio));
    return { width, height };
  }, [localPreview]);

  const tooltipVisibilityClasses = open
    ? 'opacity-100 scale-100'
    : 'opacity-0 scale-95';

  return (
    <div className="relative flex items-center" data-app-id={app.id} data-context="taskbar">
      <button
        type="button"
        aria-label={app.title}
        aria-describedby={open ? tooltipId : undefined}
        onClick={onActivate}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={buttonClassName}
        data-context="taskbar"
        data-app-id={app.id}
      >
        {children}
        {!focused && !minimized && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" aria-hidden="true" />
        )}
      </button>
      <div
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2 transform-gpu transition-all duration-150 ease-out ${tooltipVisibilityClasses}`}
        role="presentation"
      >
        <div
          id={tooltipId}
          role="tooltip"
          className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur"
        >
          {localPreview && previewDimensions ? (
            <img
              src={localPreview.dataUrl}
              alt={`${app.title} preview`}
              style={{ width: previewDimensions.width, height: previewDimensions.height }}
              className="block select-none object-cover"
            />
          ) : (
            <div className="flex h-28 w-52 items-center justify-center bg-zinc-800/80 px-4 py-3 text-center text-xs text-zinc-200">
              Preview will appear when the window has visible content.
            </div>
          )}
          <div className="flex items-center justify-between bg-black/70 px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-300">
            <span>{app.title}</span>
            {localPreview ? (
              <span>Updated {new Date(localPreview.capturedAt).toLocaleTimeString()}</span>
            ) : (
              <span>Capturing…</span>
            )}
          </div>
          <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 rotate-45 transform bg-zinc-900/95" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default TaskIcon;
