import { useRef, useEffect } from 'react';

type CanvasResizePayload = {
  width: number;
  height: number;
  scale: number;
  dpr: number;
  baseWidth: number;
  baseHeight: number;
};

export default function useCanvasResize(
  baseWidth: number,
  baseHeight: number,
  onResize?: (payload: CanvasResizePayload) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

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
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      if (ctx) ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      onResize?.({
        width: canvas.width,
        height: canvas.height,
        scale,
        dpr,
        baseWidth,
        baseHeight,
      });
    };

    resize();
    const ro = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      ro.disconnect();
    };
  }, [baseWidth, baseHeight, onResize]);

  return canvasRef;
}
