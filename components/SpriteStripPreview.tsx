"use client";

import React, { useEffect, useId, useState } from 'react';
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
const SpriteStripPreview: React.FC<SpriteStripPreviewProps> = ({
  src,
  frameWidth,
  frameHeight,
  frames,
  fps = 12,
}) => {
  const [frame, setFrame] = useState(0);
  const [zoom, setZoom] = useState(100);
  const sliderId = useId();

  const minZoom = 50;
  const maxZoom = 200;
  const scale = zoom / 100;

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

  const containerStyle: React.CSSProperties = {
    width: frameWidth * (maxZoom / 100),
    height: frameHeight * (maxZoom / 100),
    maxWidth: '100%',
    aspectRatio: `${frameWidth} / ${frameHeight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const previewStyle: React.CSSProperties = {
    width: frameWidth,
    height: frameHeight,
    backgroundImage: `url(${src})`,
    backgroundPosition: `-${frame * frameWidth}px 0px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    transform: `scale(${scale})`,
    transformOrigin: 'center',
  };

  const sliderWrapperStyle: React.CSSProperties = {
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const sliderStyle: React.CSSProperties = {
    flex: 1,
  };

  return (
    <div>
      <div style={containerStyle}>
        <div style={previewStyle} data-testid="sprite-strip-preview" />
      </div>
      <div style={sliderWrapperStyle}>
        <label htmlFor={sliderId}>Zoom</label>
        <input
          id={sliderId}
          type="range"
          min={minZoom}
          max={maxZoom}
          step={10}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-valuetext={`${zoom}%`}
          style={sliderStyle}
        />
        <span>{zoom}%</span>
      </div>
    </div>
  );
};

export default SpriteStripPreview;
