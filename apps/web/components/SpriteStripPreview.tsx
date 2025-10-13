"use client";

import React, { useEffect, useState } from 'react';
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
