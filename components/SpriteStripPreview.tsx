"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { importSpriteStrip } from '../utils/spriteStrip';

interface SpriteStripPreviewProps {
  /** path to the sprite strip image */
  src: string;
  /** width of a single frame in pixels */
  frameWidth: number;
  /** height of a single frame in pixels */
  frameHeight: number;
  /** total number of frames in the strip */
  frames: number;
  /** frames per second for animation */
  fps?: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;

const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/**
 * Renders a sprite strip and cycles through the frames for preview purposes.
 * Supports pinch-to-zoom gestures and a grid overlay toggle to aid inspection.
 */
const SpriteStripPreview: React.FC<SpriteStripPreviewProps> = ({
  src,
  frameWidth,
  frameHeight,
  frames,
  fps = 12,
}) => {
  const [frame, setFrame] = useState(0);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinchStateRef = useRef({ initialDistance: 0, initialScale: 1 });
  const scaleRef = useRef(scale);

  const setScaleState = useCallback((value: number | ((prev: number) => number)) => {
    setScale((prev) => {
      const next = clamp(typeof value === 'function' ? value(prev) : value);
      scaleRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Preload and cache the sprite strip
  useEffect(() => {
    importSpriteStrip(src);
  }, [src]);

  // Cycle through frames
  useEffect(() => {
    const id = window.setInterval(
      () => setFrame((f) => (f + 1) % frames),
      1000 / fps,
    );
    return () => window.clearInterval(id);
  }, [frames, fps]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const [a, b] = [touches[0], touches[1]];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchStateRef.current = {
          initialDistance: getDistance(event.touches),
          initialScale: scaleRef.current,
        };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;

      const { initialDistance, initialScale } = pinchStateRef.current;
      if (!initialDistance) return;

      const distance = getDistance(event.touches);
      if (!distance) return;

      const ratio = distance / initialDistance;
      setScaleState(initialScale * ratio);
    };

    const resetPinch = () => {
      pinchStateRef.current = {
        initialDistance: 0,
        initialScale: scaleRef.current,
      };
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', resetPinch, { passive: true });
    container.addEventListener('touchcancel', resetPinch, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', resetPinch);
      container.removeEventListener('touchcancel', resetPinch);
    };
  }, [setScaleState]);

  const spriteStyle: React.CSSProperties = {
    width: frameWidth,
    height: frameHeight,
    backgroundImage: `url(${src})`,
    backgroundPosition: `-${frame * frameWidth}px 0px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
    backgroundSize: '10px 10px',
    pointerEvents: 'none',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{Math.round(scale * 100)}% zoom</span>
        <button
          type="button"
          className="rounded border border-slate-600 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-200 transition hover:border-slate-400 hover:text-white"
          onClick={() => setShowGrid((value) => !value)}
          aria-pressed={showGrid}
        >
          {showGrid ? 'Hide grid' : 'Show grid'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-md border border-slate-700 bg-black/40"
        style={{
          width: frameWidth,
          height: frameHeight,
          touchAction: 'none',
        }}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: frameWidth,
            height: frameHeight,
          }}
        >
          <div style={spriteStyle} data-testid="sprite-strip-preview" />
        </div>
        {showGrid ? <div data-testid="sprite-strip-grid" style={overlayStyle} aria-hidden="true" /> : null}
      </div>
    </div>
  );
};

export default SpriteStripPreview;
