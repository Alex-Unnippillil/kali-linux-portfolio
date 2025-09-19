'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toCanvas } from 'html-to-image';
import { useSettings } from '../../hooks/useSettings';

const MAX_WIDTH = 280;
const MAX_HEIGHT = 180;
const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 140;
const VIEWPORT_PADDING = 12;
const HEADER_HEIGHT = 40;

type AnchorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TaskPreviewProps = {
  app: { id: string; title: string; icon: string } | null;
  anchor: AnchorRect | null;
  minimized: boolean;
  visible: boolean;
  onClose: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

type FrameSize = {
  width: number;
  height: number;
  scaledWidth: number;
  scaledHeight: number;
};

type Status = 'idle' | 'loading' | 'ready' | 'minimized' | 'missing' | 'error';

const defaultFrame: FrameSize = {
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  scaledWidth: DEFAULT_WIDTH,
  scaledHeight: DEFAULT_HEIGHT,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const TaskPreview: React.FC<TaskPreviewProps> = ({
  app,
  anchor,
  minimized,
  visible,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>();
  const [frameSize, setFrameSize] = useState<FrameSize>(defaultFrame);
  const [status, setStatus] = useState<Status>('idle');
  const { reducedMotion } = useSettings();

  const captureFrame = useCallback(async () => {
    if (!app || !canvasRef.current) {
      setStatus((prev) => (prev === 'missing' ? prev : 'missing'));
      return;
    }

    const node = document.getElementById(app.id);
    if (!node) {
      setStatus((prev) => (prev === 'missing' ? prev : 'missing'));
      return;
    }

    const computed = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const hidden =
      computed.visibility === 'hidden' ||
      computed.display === 'none' ||
      rect.width === 0 ||
      rect.height === 0;

    if (minimized || hidden) {
      setStatus((prev) => (prev === 'ready' ? prev : 'minimized'));
      return;
    }

    try {
      const offscreen = await toCanvas(node, { cacheBust: false });
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        setStatus('error');
        return;
      }

      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(offscreen, 0, 0);

      const scale = Math.min(MAX_WIDTH / offscreen.width, MAX_HEIGHT / offscreen.height, 1);
      const scaledWidth = Math.max(Math.round(offscreen.width * scale), 120);
      const scaledHeight = Math.max(Math.round(offscreen.height * scale), 80);

      setFrameSize({
        width: offscreen.width,
        height: offscreen.height,
        scaledWidth,
        scaledHeight,
      });
      setStatus('ready');
    } catch (error) {
      setStatus('error');
    }
  }, [app, minimized]);

  useEffect(() => {
    if (!visible) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
      return;
    }

    setStatus('loading');
    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      await captureFrame();
      if (!cancelled && !reducedMotion) {
        frameRef.current = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => {
      cancelled = true;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    };
  }, [captureFrame, reducedMotion, visible]);

  useEffect(() => {
    if (!visible) {
      setStatus('idle');
      setFrameSize(defaultFrame);
    }
  }, [visible]);

  const style = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        left: '50%',
        top: `calc(100% - ${defaultFrame.scaledHeight + HEADER_HEIGHT + VIEWPORT_PADDING}px)`,
        width: defaultFrame.scaledWidth,
      } as React.CSSProperties;
    }

    const width = frameSize.scaledWidth;
    const height = frameSize.scaledHeight + HEADER_HEIGHT;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchor
      ? anchor.left + anchor.width / 2 - width / 2
      : viewportWidth / 2 - width / 2;
    left = clamp(left, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);

    let top = anchor
      ? anchor.top - frameSize.scaledHeight - HEADER_HEIGHT - VIEWPORT_PADDING
      : viewportHeight - height - VIEWPORT_PADDING;

    if (top < VIEWPORT_PADDING && anchor) {
      top = anchor.top + anchor.height + VIEWPORT_PADDING;
    }

    if (top + height > viewportHeight - VIEWPORT_PADDING) {
      top = viewportHeight - height - VIEWPORT_PADDING;
    }

    return {
      left,
      top,
      width,
    } as React.CSSProperties;
  }, [anchor, frameSize]);

  if (!visible || !app) {
    return null;
  }

  const statusMessage = (() => {
    switch (status) {
      case 'loading':
        return 'Loading preview…';
      case 'minimized':
        return 'Window is minimized';
      case 'missing':
        return 'Preview unavailable';
      case 'error':
        return 'Unable to render preview';
      default:
        return null;
    }
  })();

  const handleClose = () => {
    onClose(app.id);
  };

  return (
    <div
      role="dialog"
      aria-label={`${app.title} preview`}
      className="fixed z-50 rounded-lg shadow-lg bg-ub-dark-surface border border-black border-opacity-50 text-white"
      style={style}
      data-testid="task-preview"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center justify-between px-3" style={{ height: HEADER_HEIGHT }}>
        <div className="flex items-center gap-2">
          <Image
            src={app.icon.replace('./', '/')}
            alt=""
            width={24}
            height={24}
            className="w-5 h-5"
            sizes="24px"
          />
          <span className="text-sm font-medium">{app.title}</span>
        </div>
        <button
          type="button"
          className="rounded px-2 py-1 text-xs bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          onClick={handleClose}
          aria-label={`Close ${app.title}`}
          data-testid="task-preview-close"
        >
          Close
        </button>
      </div>
      <div
        className="relative bg-black bg-opacity-80 rounded-b-lg overflow-hidden"
        style={{ width: frameSize.scaledWidth, height: frameSize.scaledHeight }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        {statusMessage && (
          <div className="absolute inset-0 flex items-center justify-center text-xs bg-black bg-opacity-60">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPreview;
