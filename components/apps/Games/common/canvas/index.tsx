import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';

export interface CanvasHandle {
  getInputCoords: (
    e: MouseEvent | TouchEvent
  ) => { x: number; y: number };
}

interface CanvasProps {
  width: number;
  height: number;
  className?: string;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  ({ width, height, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }, [width, height]);

    useImperativeHandle(ref, () => ({
      getInputCoords(e) {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
          x: ((clientX - rect.left) * width) / rect.width,
          y: ((clientY - rect.top) * height) / rect.height,
        };
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
);

Canvas.displayName = 'Canvas';

export default Canvas;
