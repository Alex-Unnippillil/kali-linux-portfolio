"use client";

import React, { useEffect, useRef, useState } from 'react';
import { importSpriteStrip } from '../utils/spriteStrip';
import { useWindowLifecycle } from './desktop/Window';

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
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const { isForeground } = useWindowLifecycle();

  // Preload and cache the sprite strip
  useEffect(() => {
    importSpriteStrip(src);
  }, [src]);

  // Cycle through frames
  useEffect(() => {
    if (!isForeground) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastRef.current = 0;
      return undefined;
    }
    let cancelled = false;
    const step = 1000 / Math.max(fps, 1);
    const advance = (now: number) => {
      if (cancelled) return;
      if (lastRef.current === 0) {
        lastRef.current = now;
      }
      if (now - lastRef.current >= step) {
        lastRef.current = now;
        setFrame((f) => (f + 1) % frames);
      }
      rafRef.current = requestAnimationFrame(advance);
    };
    rafRef.current = requestAnimationFrame(advance);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastRef.current = 0;
    };
  }, [frames, fps, isForeground]);

  const style: React.CSSProperties = {
    width: frameWidth,
    height: frameHeight,
    backgroundImage: `url(${src})`,
    backgroundPosition: `-${frame * frameWidth}px 0px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  };

  return <div style={style} data-testid="sprite-strip-preview" />;
};

export default SpriteStripPreview;
