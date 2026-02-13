"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { importSpriteStrip } from '../../utils/spriteStrip';

interface SpriteStripPreviewProps {
  /** path to the sprite strip image */
  src: string;
  /** width of a single frame in pixels */
  frameWidth: number;
  /** height of a single frame in pixels */
  frameHeight: number;
  /** total number of frames in the strip */
  frames: number;
  /** initial zoom factor (defaults to 1) */
  initialZoom?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Canvas based sprite strip preview with zoom and frame controls.
 */
const SpriteStripPreview: React.FC<SpriteStripPreviewProps> = ({
  src,
  frameWidth,
  frameHeight,
  frames,
  initialZoom = 1,
}) => {
  const [frame, setFrame] = useState(0);
  const [zoom, setZoom] = useState(() => clamp(initialZoom, 1, 8));
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const zoomSliderId = useId();
  const frameSliderId = useId();

  // Ensure frame index stays in range when props change
  useEffect(() => {
    setFrame((current) => (frames > 0 ? clamp(current, 0, frames - 1) : 0));
  }, [frames]);

  // Preload sprite strip and listen for when it's ready
  useEffect(() => {
    const sprite = importSpriteStrip(src);

    const handleReady = () => {
      setImage(sprite);
    };

    if (sprite.complete && sprite.naturalWidth > 0) {
      handleReady();
      return;
    }

    const previousOnLoad = sprite.onload;
    const canUseAddEventListener = typeof sprite.addEventListener === 'function';

    if (canUseAddEventListener) {
      sprite.addEventListener('load', handleReady as EventListener);
    }

    if (sprite.onload !== handleReady) {
      sprite.onload = handleReady;
    }

    return () => {
      if (canUseAddEventListener) {
        sprite.removeEventListener('load', handleReady as EventListener);
      }
      if (sprite.onload === handleReady) {
        sprite.onload = previousOnLoad ?? null;
      }
    };
  }, [src]);

  const renderFrame = useCallback(
    (
      context: CanvasRenderingContext2D,
      sprite: HTMLImageElement,
      frameIndex: number,
      zoomFactor: number,
    ) => {
      const displayWidth = Math.max(1, Math.round(frameWidth * zoomFactor));
      const displayHeight = Math.max(1, Math.round(frameHeight * zoomFactor));

      if (canvasRef.current) {
        canvasRef.current.width = displayWidth;
        canvasRef.current.height = displayHeight;
        canvasRef.current.style.width = `${displayWidth}px`;
        canvasRef.current.style.height = `${displayHeight}px`;
      }

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, displayWidth, displayHeight);
      context.drawImage(
        sprite,
        frameIndex * frameWidth,
        0,
        frameWidth,
        frameHeight,
        0,
        0,
        displayWidth,
        displayHeight,
      );
    },
    [frameHeight, frameWidth],
  );

  // Render current frame whenever dependencies change
  useEffect(() => {
    const sprite = image;
    const canvas = canvasRef.current;

    if (!sprite || !canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    renderFrame(context, sprite, frame, zoom);
  }, [frame, image, renderFrame, zoom]);

  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(Number(event.target.value));
  }, []);

  const handleFrameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFrame(Number(event.target.value));
  }, []);

  const incrementFrame = useCallback(() => {
    setFrame((current) => (frames > 0 ? (current + 1) % frames : 0));
  }, [frames]);

  const decrementFrame = useCallback(() => {
    setFrame((current) => (frames > 0 ? (current - 1 + frames) % frames : 0));
  }, [frames]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        incrementFrame();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        decrementFrame();
      }
    },
    [decrementFrame, incrementFrame],
  );

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `sprite-frame-${frame + 1}.png`;
    link.click();
  }, [frame]);

  const controlsDisabled = useMemo(() => frames <= 0, [frames]);

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="sprite-strip-preview"
      role="group"
      aria-label="Sprite strip preview"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        className="border border-slate-500 bg-black"
        aria-label={`Frame ${frame + 1} of ${frames}`}
      />
      <div className="flex flex-col gap-2" aria-live="polite">
        <div className="flex flex-col gap-1">
          <label htmlFor={frameSliderId} className="text-sm font-medium">
            Frame {frames > 0 ? frame + 1 : 0} / {frames}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decrementFrame}
              className="rounded border border-slate-500 px-2 py-1 text-sm"
              aria-label="Previous frame"
              disabled={controlsDisabled}
            >
              Prev
            </button>
            <input
              id={frameSliderId}
              type="range"
              min={0}
              max={Math.max(frames - 1, 0)}
              step={1}
              value={frame}
              onChange={handleFrameChange}
              aria-valuemin={0}
              aria-valuemax={Math.max(frames - 1, 0)}
              aria-valuenow={frame}
              className="flex-1"
              disabled={controlsDisabled}
            />
            <button
              type="button"
              onClick={incrementFrame}
              className="rounded border border-slate-500 px-2 py-1 text-sm"
              aria-label="Next frame"
              disabled={controlsDisabled}
            >
              Next
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={zoomSliderId} className="text-sm font-medium">
            Zoom {zoom.toFixed(1)}×
          </label>
          <input
            id={zoomSliderId}
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={zoom}
            onChange={handleZoomChange}
            aria-valuemin={1}
            aria-valuemax={8}
            aria-valuenow={zoom}
            disabled={controlsDisabled}
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="w-fit rounded border border-slate-500 px-3 py-1 text-sm"
          disabled={controlsDisabled}
        >
          Export current frame
        </button>
      </div>
    </div>
  );
};

export default SpriteStripPreview;
