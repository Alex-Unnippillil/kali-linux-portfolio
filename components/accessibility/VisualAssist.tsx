"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAccessibilityPrefs } from "../../hooks/useAccessibilityPrefs";

const LENS_SIZE = 280;

type Html2Canvas = typeof import("html2canvas") extends { default: infer D }
  ? D
  : never;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handle = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  return viewport;
};

interface VisualAssistProps {
  children: ReactNode;
}

const VisualAssist = ({ children }: VisualAssistProps) => {
  const {
    hoverLensEnabled,
    fullScreenMagnifierEnabled,
    hoverZoom,
    fullscreenZoom,
    filterStyle,
  } = useAccessibilityPrefs();
  const viewport = useViewport();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState({
    x: viewport.width / 2,
    y: viewport.height / 2,
  });
  const [lensSnapshot, setLensSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!hoverLensEnabled && !fullScreenMagnifierEnabled) return;

    const update = (event: PointerEvent) => {
      setCursor({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("pointermove", update, { passive: true });
    return () => window.removeEventListener("pointermove", update);
  }, [hoverLensEnabled, fullScreenMagnifierEnabled]);

  useEffect(() => {
    setCursor({ x: viewport.width / 2, y: viewport.height / 2 });
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    if (!hoverLensEnabled) {
      setLensSnapshot(null);
      return;
    }

    let mounted = true;
    let timer: number | undefined;
    let html2canvasInstance: Html2Canvas | null = null;

    const ensureCanvas = async () => {
      if (html2canvasInstance) return html2canvasInstance;
      const module = await import("html2canvas");
      html2canvasInstance = module.default;
      return html2canvasInstance;
    };

    const capture = async () => {
      if (!mounted || !contentRef.current) return;
      try {
        const html2canvas = await ensureCanvas();
        const canvas = await html2canvas(contentRef.current, {
          backgroundColor: null,
          scale: window.devicePixelRatio,
        });
        if (mounted) {
          setLensSnapshot(canvas.toDataURL("image/png"));
        }
      } catch (error) {
        console.error("Visual assist lens capture failed", error);
      }
    };

    capture();
    timer = window.setInterval(capture, 1200);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [hoverLensEnabled, fullscreenZoom, hoverZoom, filterStyle]);

  const transform = useMemo(() => {
    if (!fullScreenMagnifierEnabled || fullscreenZoom === 1) return "none";
    const offsetX = clamp(
      cursor.x * (fullscreenZoom - 1),
      0,
      viewport.width * (fullscreenZoom - 1),
    );
    const offsetY = clamp(
      cursor.y * (fullscreenZoom - 1),
      0,
      viewport.height * (fullscreenZoom - 1),
    );
    return `translate3d(${-offsetX}px, ${-offsetY}px, 0) scale(${fullscreenZoom})`;
  }, [cursor.x, cursor.y, fullScreenMagnifierEnabled, fullscreenZoom, viewport.height, viewport.width]);

  const filterValue = filterStyle === "none" ? undefined : filterStyle;

  const lensStyle = useMemo((): CSSProperties => {
    if (!hoverLensEnabled || !lensSnapshot) return { display: "none" };
    const radius = LENS_SIZE / 2;
    const backgroundWidth = viewport.width * hoverZoom;
    const backgroundHeight = viewport.height * hoverZoom;
    const bgX = -cursor.x * hoverZoom + radius;
    const bgY = -cursor.y * hoverZoom + radius;
    return {
      position: "fixed",
      width: `${LENS_SIZE}px`,
      height: `${LENS_SIZE}px`,
      top: 0,
      left: 0,
      transform: `translate3d(${cursor.x - radius}px, ${cursor.y - radius}px, 0)`,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.7)",
      boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
      backgroundImage: `url(${lensSnapshot})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${backgroundWidth}px ${backgroundHeight}px`,
      backgroundPosition: `${bgX}px ${bgY}px`,
      pointerEvents: "none",
      zIndex: 2147483000,
      filter: filterValue,
    };
  }, [cursor.x, cursor.y, filterValue, hoverLensEnabled, hoverZoom, lensSnapshot, viewport.height, viewport.width]);

  return (
    <Fragment>
      <div
        ref={contentRef}
        className="relative min-h-screen w-full"
        style={{
          transform: transform === "none" ? undefined : transform,
          transformOrigin: "0 0",
          transition: "transform 150ms ease-out",
          filter: filterValue,
          overflow: fullScreenMagnifierEnabled ? "hidden" : undefined,
        }}
      >
        {children}
      </div>
      <div style={lensStyle} aria-hidden />
      <svg
        aria-hidden
        width={0}
        height={0}
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id="va-filter-protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"
            />
          </filter>
          <filter id="va-filter-deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"
            />
          </filter>
          <filter id="va-filter-tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </Fragment>
  );
};

export default VisualAssist;
