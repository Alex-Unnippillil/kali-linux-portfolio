import { useRef, useEffect } from 'react';
import { useSettings } from './useSettings';

export default function useCanvasResize(baseWidth: number, baseHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { uiScale } = useSettings();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { clientWidth, clientHeight } = parent;
      const scale = Math.min(
        clientWidth / baseWidth,
        clientHeight / baseHeight,
      );
      const width = baseWidth * scale;
      const height = baseHeight * scale;
      const dpr = (window.devicePixelRatio || 1) * uiScale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };

    resize();
    const parent = canvas.parentElement;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(resize)
        : null;
    if (ro && parent) ro.observe(parent);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, [baseWidth, baseHeight, uiScale]);

  return canvasRef;
}
