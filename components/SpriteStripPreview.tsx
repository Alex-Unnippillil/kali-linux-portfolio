"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Renders a sprite strip and cycles through the frames for preview purposes.
 */
const MIN_SCALE = 0.5;
const MAX_SCALE = 6;
const KEYBOARD_ZOOM_STEP = 0.25;

const SpriteStripPreview: React.FC<SpriteStripPreviewProps> = ({
  src,
  frameWidth,
  frameHeight,
  frames,
  fps = 12,
}) => {
  const [frame, setFrame] = useState(0);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const pointerCacheRef = useRef<Map<number, PointerEvent>>(new Map());
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const latestScaleRef = useRef(1);

  const clampScale = useCallback((value: number) => {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return 1;
    }
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
  }, []);

  useEffect(() => {
    latestScaleRef.current = scale;
  }, [scale]);

  // Preload and cache the sprite strip
  useEffect(() => {
    importSpriteStrip(src);
  }, [src]);

  useEffect(() => {
    setScale(1);
    latestScaleRef.current = 1;
  }, [src]);

  // Cycle through frames
  useEffect(() => {
    const id = window.setInterval(
      () => setFrame((f) => (f + 1) % frames),
      1000 / fps,
    );
    return () => window.clearInterval(id);
  }, [frames, fps]);

  const applyScale = useCallback(
    (value: number | ((prev: number) => number)) => {
      setScale((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        return clampScale(next);
      });
    },
    [clampScale],
  );

  const handleKeyboardZoom = useCallback(
    (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        applyScale((prev) => prev + KEYBOARD_ZOOM_STEP);
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        applyScale((prev) => prev - KEYBOARD_ZOOM_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        applyScale(1);
      }
    },
    [applyScale],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardZoom);
    return () => window.removeEventListener('keydown', handleKeyboardZoom);
  }, [handleKeyboardZoom]);

  const updatePinchDistance = useCallback(() => {
    const pointers = Array.from(pointerCacheRef.current.values());
    if (pointers.length < 2) {
      pinchDistanceRef.current = null;
      return;
    }
    const [a, b] = pointers;
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchDistanceRef.current = distance > 0 ? distance : null;
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) {
      return undefined;
    }

    const pointerCache = pointerCacheRef.current;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        return;
      }
      pointerCache.set(event.pointerId, event);
      if (pointerCache.size === 2) {
        pinchStartScaleRef.current = latestScaleRef.current;
        updatePinchDistance();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        return;
      }
      if (!pointerCache.has(event.pointerId)) {
        return;
      }
      pointerCache.set(event.pointerId, event);
      if (pointerCache.size < 2) {
        return;
      }

      if (pinchDistanceRef.current == null) {
        updatePinchDistance();
        return;
      }

      const pointers = Array.from(pointerCache.values());
      const [a, b] = pointers;
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (!distance || !pinchDistanceRef.current) {
        return;
      }
      const nextScale =
        pinchStartScaleRef.current * (distance / pinchDistanceRef.current);
      applyScale(nextScale);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (pointerCache.has(event.pointerId)) {
        pointerCache.delete(event.pointerId);
      }
      if (pointerCache.size < 2) {
        pinchDistanceRef.current = null;
      } else {
        updatePinchDistance();
      }
    };

    el.addEventListener('pointerdown', handlePointerDown, { passive: true });
    el.addEventListener('pointermove', handlePointerMove, { passive: true });
    el.addEventListener('pointerup', handlePointerEnd, { passive: true });
    el.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    el.addEventListener('pointerleave', handlePointerEnd, { passive: true });

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerEnd);
      el.removeEventListener('pointercancel', handlePointerEnd);
      el.removeEventListener('pointerleave', handlePointerEnd);
      pointerCache.clear();
      pinchDistanceRef.current = null;
    };
  }, [applyScale, updatePinchDistance]);

  const toggleGrid = useCallback(() => {
    setShowGrid((value) => !value);
  }, []);

  const resetZoom = useCallback(() => {
    applyScale(1);
  }, [applyScale]);

  const previewStyle: React.CSSProperties = useMemo(
    () => ({
      width: frameWidth,
      height: frameHeight,
      backgroundImage: `url(${src})`,
      backgroundPosition: `-${frame * frameWidth}px 0px`,
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }),
    [frame, frameHeight, frameWidth, scale, src],
  );

  const gridOverlayStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
      backgroundSize: '8px 8px',
      mixBlendMode: 'screen',
      opacity: 0.8,
    }),
    [],
  );

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      gap: '0.5rem',
      color: 'inherit',
    }),
    [],
  );

  const viewerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      width: frameWidth,
      height: frameHeight,
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(0,0,0,0.4)',
      overflow: 'visible',
      touchAction: 'none',
      userSelect: 'none',
    }),
    [frameHeight, frameWidth],
  );

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={toggleGrid}
          aria-pressed={showGrid}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid rgba(255,255,255,0.2)',
            background: showGrid ? 'rgba(96,165,250,0.2)' : 'rgba(17,24,39,0.4)',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {showGrid ? 'Hide grid' : 'Show grid'}
        </button>
        <button
          type="button"
          onClick={resetZoom}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(17,24,39,0.4)',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          Reset zoom
        </button>
        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>{Math.round(scale * 100)}%</span>
      </div>
      <div ref={previewRef} style={viewerStyle}>
        <div style={previewStyle} data-testid="sprite-strip-preview" />
        {showGrid ? (
          <div data-testid="sprite-strip-grid" style={gridOverlayStyle} />
        ) : null}
      </div>
    </div>
  );
};

export default SpriteStripPreview;
