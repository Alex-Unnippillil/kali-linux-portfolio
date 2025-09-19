"use client";

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

type OutlineBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

interface WindowOutlineProps {
  bounds: OutlineBounds | null;
  visible: boolean;
  className?: string;
  root?: HTMLElement | null;
}

const WindowOutline = ({ bounds, visible, className = '', root }: WindowOutlineProps) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>();
  const frameRef = useRef<number | null>(null);
  const latestBounds = useRef<OutlineBounds | null>(bounds);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (root) {
      setTarget(root);
      return;
    }
    setTarget(document.body);
  }, [root]);

  useEffect(() => {
    latestBounds.current = bounds;
    if (typeof window === 'undefined') return;

    if (!visible || !bounds) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setStyle(undefined);
      return;
    }

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const next = latestBounds.current;
      if (next) {
        setStyle({
          left: `${next.left}px`,
          top: `${next.top}px`,
          width: `${next.width}px`,
          height: `${next.height}px`,
        });
      }
    });

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [bounds, visible]);

  useEffect(() => () => {
    if (typeof window === 'undefined') return;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  if (!visible || !target || !style) {
    return null;
  }

  const classes = [
    'pointer-events-none fixed border border-dashed border-white/80 bg-white/10 backdrop-blur-sm transition-none z-50',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div data-testid="window-resize-ghost" className={classes} style={style} />,
    target,
  );
};

export default WindowOutline;
