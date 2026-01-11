import React, { useEffect, useRef, useState } from 'react';
import setupCanvasRenderer, { type RendererController } from '../../utils/canvas/offscreen';
import {
  createPerformanceGraphRenderer,
  type PerformanceGraphMessage,
  type PerformanceGraphTelemetry,
} from '../../utils/canvas/performanceGraphRenderer';
import { ingestPerformanceTelemetry } from '../../utils/performanceTelemetry';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 32;
const GRAPH_HEIGHT = 18;
const GRAPH_WIDTH = 80;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => {
        mediaQuery.removeEventListener('change', updatePreference);
      };
    }

    mediaQuery.addListener(updatePreference);
    return () => {
      mediaQuery.removeListener(updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

type PerformanceGraphProps = {
  className?: string;
};

const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ className }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RendererController<PerformanceGraphMessage> | null>(null);
  const motionRef = useRef(prefersReducedMotion);
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);

  motionRef.current = prefersReducedMotion;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const fallback = (cnv: HTMLCanvasElement, emit: (response: PerformanceGraphTelemetry) => void) => {
      const ctx = cnv.getContext('2d');
      if (!ctx) {
        return {
          handleMessage: () => undefined,
          dispose: () => undefined,
        };
      }
      const renderer = createPerformanceGraphRenderer(ctx, emit, 'fallback');
      return {
        handleMessage(message: PerformanceGraphMessage) {
          renderer.handleMessage(message);
        },
        dispose() {
          renderer.dispose();
        },
      };
    };

    const controller = setupCanvasRenderer<PerformanceGraphMessage, PerformanceGraphTelemetry>({
      canvas,
      createWorker: () => new Worker(new URL('../../workers/performance-graph.worker.ts', import.meta.url)),
      onMessage: event => ingestPerformanceTelemetry(event.data),
      fallback: (cnv, emit) => fallback(cnv, emit),
    });

    rendererRef.current = controller;

    controller.postMessage({
      type: 'setup',
      width: GRAPH_WIDTH,
      height: GRAPH_HEIGHT,
      dpr: window.devicePixelRatio || 1,
      maxPoints: MAX_POINTS,
    });
    controller.postMessage({ type: 'config', prefersReducedMotion: motionRef.current });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current as number);
        timeoutRef.current = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      try {
        controller.postMessage({ type: 'dispose' });
      } catch {
        // ignore dispose errors during teardown
      }
      controller.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const controller = rendererRef.current;
    if (!controller) return undefined;

    controller.postMessage({ type: 'config', prefersReducedMotion });

    if (prefersReducedMotion) {
      controller.postMessage({ type: 'clear', value: 0.28 });
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current as number);
        timeoutRef.current = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;

    const scheduleNext = () => {
      timeoutRef.current = window.setTimeout(() => {
        frameRef.current = requestAnimationFrame(captureSample);
      }, SAMPLE_INTERVAL);
    };

    const captureSample = (time: number) => {
      if (cancelled) return;
      const delta = time - lastSampleRef.current;
      lastSampleRef.current = time;
      if (delta <= 0 || !Number.isFinite(delta)) {
        scheduleNext();
        return;
      }
      rendererRef.current?.postMessage({ type: 'sample', delta });
      scheduleNext();
    };

    frameRef.current = requestAnimationFrame(captureSample);

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current as number);
        timeoutRef.current = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [prefersReducedMotion]);

  return (
    <div
      className={
        'hidden items-center pr-2 text-ubt-grey/70 sm:flex md:pr-3 lg:pr-4' + (className ? ` ${className}` : '')
      }
      aria-hidden="true"
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <canvas
        ref={canvasRef}
        width={GRAPH_WIDTH}
        height={GRAPH_HEIGHT}
        className="opacity-90"
        role="presentation"
        aria-hidden="true"
      />
    </div>
  );
};

export default PerformanceGraph;
