"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toCanvas } from 'html-to-image';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface MagnifierOverlayProps {
  targetRef: React.RefObject<HTMLElement>;
  enabled: boolean;
  zoom: number;
  radius: number;
  onClose: () => void;
  testId?: string;
  contentKey?: string;
}

interface CaptureResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  error: string | null;
}

const MAX_PIXEL_RATIO = 2;

const MagnifierOverlay: React.FC<MagnifierOverlayProps> = ({
  targetRef,
  enabled,
  zoom,
  radius,
  onClose,
  testId,
  contentKey,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const requestRef = useRef<number | null>(null);
  const lastEventRef = useRef<PointerEvent | null>(null);

  const diameter = useMemo(() => Math.max(20, Math.round(radius * 2)), [radius]);
  const normalizedZoom = useMemo(() => Math.max(1.0001, zoom), [zoom]);

  const captureTarget = useCallback(async (): Promise<CaptureResult | null> => {
    const node = targetRef.current;
    if (!node) return null;
    try {
      const ratio =
        typeof window !== 'undefined'
          ? Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
          : 1;
      const canvas = await toCanvas(node, {
        cacheBust: true,
        pixelRatio: ratio,
        skipFonts: false,
      });
      return {
        canvas,
        dataUrl: canvas.toDataURL('image/png'),
        error: null,
      };
    } catch (err) {
      const fallback = document.createElement('canvas');
      fallback.width = node.clientWidth || 1;
      fallback.height = node.clientHeight || 1;
      const ctx = fallback.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, fallback.width, fallback.height);
        gradient.addColorStop(0, '#1f2937');
        gradient.addColorStop(1, '#111827');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fallback.width, fallback.height);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Preview unavailable', fallback.width / 2, fallback.height / 2);
      }
      const message =
        err instanceof Error
          ? err.name === 'SecurityError'
            ? 'Magnifier preview unavailable for this page.'
            : `Magnifier capture failed: ${err.message}`
          : 'Magnifier preview unavailable for this page.';
      return {
        canvas: fallback,
        dataUrl: fallback.toDataURL('image/png'),
        error: message,
      };
    }
  }, [targetRef]);

  useEffect(() => {
    if (!enabled) {
      setDataUrl(null);
      setError(null);
      sourceCanvasRef.current = null;
      return;
    }
    let cancelled = false;
    setLoading(true);
    captureTarget().then((result) => {
      if (cancelled || !result) return;
      sourceCanvasRef.current = result.canvas;
      setDataUrl(result.dataUrl);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, captureTarget, refreshToken, contentKey]);

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onClose]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const lens = lensRef.current;
    const outputCanvas = canvasRef.current;
    const sourceCanvas = sourceCanvasRef.current;
    if (!enabled || !overlay || !lens || !outputCanvas || !sourceCanvas || !dataUrl) {
      return;
    }
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    const updateLens = (event: PointerEvent) => {
      const target = targetRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, rect.width);
      const y = clamp(event.clientY - rect.top, 0, rect.height);
      lens.style.opacity = '1';
      lens.style.transform = `translate(${x - radius}px, ${y - radius}px)`;

      const scaleX = sourceCanvas.width / (rect.width || 1);
      const scaleY = sourceCanvas.height / (rect.height || 1);
      const sampleWidth = (diameter / normalizedZoom) * scaleX;
      const sampleHeight = (diameter / normalizedZoom) * scaleY;

      const srcX = clamp(x * scaleX - sampleWidth / 2, 0, Math.max(0, sourceCanvas.width - sampleWidth));
      const srcY = clamp(y * scaleY - sampleHeight / 2, 0, Math.max(0, sourceCanvas.height - sampleHeight));

      ctx.clearRect(0, 0, diameter, diameter);
      ctx.save();
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        sourceCanvas,
        srcX,
        srcY,
        sampleWidth,
        sampleHeight,
        0,
        0,
        diameter,
        diameter,
      );
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 1, 0, Math.PI * 2);
      ctx.stroke();
    };

    const handlePointerMove = (event: PointerEvent) => {
      lastEventRef.current = event;
      if (requestRef.current !== null) return;
      requestRef.current = window.requestAnimationFrame(() => {
        requestRef.current = null;
        if (lastEventRef.current) {
          updateLens(lastEventRef.current);
        }
      });
    };

    const handlePointerLeave = () => {
      lastEventRef.current = null;
      if (lensRef.current) {
        lensRef.current.style.opacity = '0';
      }
    };

    overlay.addEventListener('pointermove', handlePointerMove);
    overlay.addEventListener('pointerdown', handlePointerMove);
    overlay.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      overlay.removeEventListener('pointermove', handlePointerMove);
      overlay.removeEventListener('pointerdown', handlePointerMove);
      overlay.removeEventListener('pointerleave', handlePointerLeave);
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [enabled, dataUrl, diameter, normalizedZoom, radius, targetRef]);

  useEffect(() => {
    const lens = lensRef.current;
    const canvas = canvasRef.current;
    if (lens) {
      lens.style.width = `${diameter}px`;
      lens.style.height = `${diameter}px`;
    }
    if (canvas) {
      canvas.width = diameter;
      canvas.height = diameter;
    }
  }, [diameter]);

  useEffect(() => {
    if (!enabled) return;
    const handleResize = () => setRefreshToken((token) => token + 1);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  if (!dataUrl) {
    return (
      <div
        ref={overlayRef}
        data-testid={testId}
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 text-white"
      >
        <div className="bg-black/70 px-3 py-2 rounded text-sm">Preparing magnifier…</div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      data-testid={testId}
      className="absolute inset-0 z-50 text-white"
      style={{
        backgroundImage: `url(${dataUrl})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'top left',
      }}
    >
      <div
        ref={lensRef}
        data-testid={testId ? `${testId}-lens` : undefined}
        className="pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-150 ease-out"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div className="pointer-events-auto absolute top-2 right-2 flex flex-col items-end gap-2 text-xs">
        <div className="max-w-xs rounded bg-black/70 px-3 py-2 leading-relaxed shadow">
          <p className="font-semibold">Magnifier active</p>
          <p>Zoom: {normalizedZoom.toFixed(1)}× · Radius: {Math.round(radius)}px</p>
          {loading && <p className="mt-1 text-amber-200">Refreshing preview…</p>}
          {error && <p className="mt-1 text-amber-200">{error}</p>}
          <p className="mt-1 text-gray-300">Press Esc to exit.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            className="rounded bg-black/70 px-2 py-1 font-medium hover:bg-black/80"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-red-600 px-2 py-1 font-medium hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagnifierOverlay;
