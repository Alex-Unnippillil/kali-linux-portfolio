import { useRef, useEffect } from 'react';

export default function useCanvasResize(baseWidth: number, baseHeight: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const readUiScale = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--ui-scale');
      const parsed = parseFloat(raw.trim());
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return 1;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { clientWidth, clientHeight } = parent;
      const uiScale = readUiScale();
      const targetWidth = baseWidth * uiScale;
      const targetHeight = baseHeight * uiScale;
      const widthRatio = targetWidth > 0 ? clientWidth / targetWidth : 1;
      const heightRatio = targetHeight > 0 ? clientHeight / targetHeight : 1;
      const scale = Math.min(
        Number.isFinite(widthRatio) && widthRatio > 0 ? widthRatio : 1,
        Number.isFinite(heightRatio) && heightRatio > 0 ? heightRatio : 1,
      );
      const width = targetWidth * scale;
      const height = targetHeight * scale;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const transformScale = dpr * scale * uiScale;
      ctx.setTransform(transformScale, 0, 0, transformScale, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);
    window.addEventListener('resize', resize);
    const handleUiScale: EventListener = () => resize();
    window.addEventListener('ui-scale-change', handleUiScale);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('ui-scale-change', handleUiScale);
      ro.disconnect();
    };
  }, [baseWidth, baseHeight]);

  return canvasRef;
}
