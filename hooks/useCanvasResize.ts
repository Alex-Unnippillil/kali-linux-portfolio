import { useRef, useEffect } from 'react';

export default function useCanvasResize(baseWidth: number, baseHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.style.willChange = 'transform';

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
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) {
      ro.observe(parent);
    } else {
      ro.observe(canvas);
    }
    return () => {
      ro.disconnect();
    };
  }, [baseWidth, baseHeight]);

  return canvasRef;
}
