import { useRef, useEffect } from 'react';

export default function useCanvasResize(baseWidth: number, baseHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        clientHeight / baseHeight
      );
      canvas.width = baseWidth * scale;
      canvas.height = baseHeight * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [baseWidth, baseHeight]);

  return canvasRef;
}
