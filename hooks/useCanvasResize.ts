import { useRef, useEffect } from 'react';

export default function useCanvasResize(baseWidth: number, baseHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const aspect = baseWidth / baseHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Clamp playfield height between 60% and 72% of the viewport
      let height = vh * 0.66;
      height = Math.max(vh * 0.6, Math.min(height, vh * 0.72));
      let width = height * aspect;
      if (width > vw) {
        width = vw;
        height = width / aspect;
      }

      const scaleX = width / baseWidth;
      const scaleY = height / baseHeight;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      const parent = canvas.parentElement;
      if (parent) {
        parent.style.height = `${height}px`;
        parent.style.width = `${width}px`;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [baseWidth, baseHeight]);

  return canvasRef;
}
