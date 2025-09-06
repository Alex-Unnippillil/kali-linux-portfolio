"use client";

import React, { useEffect, useRef, useState } from 'react';
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
  const [url, setUrl] = useState<string | null>(null);
  const releaseRef = useRef<() => void>(() => {});
  const divRef = useRef<HTMLDivElement>(null);

  // Observe visibility to load/unload strip
  useEffect(() => {
    const node = divRef.current;
    if (!node) return;

    const load = async () => {
      const res = await importSpriteStrip(src);
      setUrl(res.url);
      releaseRef.current = res.release;
    };

    const onChange: IntersectionObserverCallback = (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          load();
        } else {
          releaseRef.current();
          releaseRef.current = () => {};
          setUrl(null);
        }
      });
    };

    const obs = new IntersectionObserver(onChange);
    obs.observe(node);
    return () => {
      obs.disconnect();
      releaseRef.current();
    };
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
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundPosition: `-${frame * frameWidth}px 0px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  };

  return <div ref={divRef} style={style} data-testid="sprite-strip-preview" />;
};

export default SpriteStripPreview;
