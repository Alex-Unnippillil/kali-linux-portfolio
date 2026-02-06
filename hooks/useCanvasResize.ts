import { useRef, useEffect } from 'react';

export default function useCanvasResize(baseWidth: number, baseHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolveContainer = () => {
      const parent = canvas.parentElement;
      if (!parent) return null;
      const { clientWidth, clientHeight } = parent;
      if (clientWidth > 0 && clientHeight > 0) {
        return parent;
      }
      const gameViewport = parent.closest('[data-game-viewport]') as HTMLElement | null;
      if (gameViewport) {
        return gameViewport;
      }
      const fallback = parent.closest('.windowMainScreen') as HTMLElement | null;
      return fallback ?? parent;
    };

    const resize = () => {
      const container = resolveContainer();
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      if (clientWidth <= 0 || clientHeight <= 0) return;
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
    const parent = canvas.parentElement;
    const gameViewport = parent?.closest('[data-game-viewport]') as HTMLElement | null;
    const fallback = parent?.closest('.windowMainScreen') as HTMLElement | null;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(resize)
        : null;
    if (parent && ro) ro.observe(parent);
    if (gameViewport && ro && gameViewport !== parent) ro.observe(gameViewport);
    if (fallback && ro && fallback !== parent) ro.observe(fallback);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, [baseWidth, baseHeight]);

  return canvasRef;
}
