import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import BaseWindow from "../base/window";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  computeExtendedSnapRegions,
  getSnapAnnouncement,
  getSnapPreviewLabel,
  measureWindowTopOffset,
} from "../../utils/windowLayout";

type BaseWindowProps = React.ComponentProps<typeof BaseWindow>;
// BaseWindow is a class component, so the instance type exposes helper methods.
type BaseWindowInstance = InstanceType<typeof BaseWindow> | null;

type MutableRef<T> = React.MutableRefObject<T>;

type SnapPosition = string | null;

type SnapRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type SnapContext = {
  viewportWidth?: number;
  viewportHeight?: number;
  topInset?: number;
  snapBottomInset?: number;
  regions?: Record<string, SnapRegion>;
};

type OverlayZone = {
  id: string;
  rect: SnapRegion;
  label: string;
};

const parsePx = (value?: string | null): number | null => {
  if (typeof value !== "string") return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNodePosition = (node: HTMLElement): { x: number; y: number } | null => {
  const style = node.style as CSSStyleDeclaration | undefined;
  if (!style) {
    return null;
  }

  if (typeof style.getPropertyValue === "function") {
    const x = parsePx(style.getPropertyValue("--window-transform-x"));
    const y = parsePx(style.getPropertyValue("--window-transform-y"));
    if (x !== null && y !== null) {
      return { x, y };
    }
  }

  const transform = style.transform;
  if (typeof transform === "string" && transform.length) {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
    if (match) {
      const parsedX = parseFloat(match[1]);
      const parsedY = parseFloat(match[2]);
      if (Number.isFinite(parsedX) && Number.isFinite(parsedY)) {
        return { x: parsedX, y: parsedY };
      }
    }
  }

  return null;
};

type DesktopWindowProps = BaseWindowProps & {
  onSnapChange?: (snapPosition: SnapPosition) => void;
};

const DesktopWindow = React.forwardRef<BaseWindowInstance, DesktopWindowProps>(
  (props, forwardedRef) => {
    const { onSnapChange, ...restProps } = props;
    const innerRef = useRef<BaseWindowInstance>(null);
    const [dragContext, setDragContext] = useState<SnapContext | null>(null);
    const [dragging, setDragging] = useState(false);
    const [activePreview, setActivePreview] = useState<SnapPosition>(null);
    const [announcement, setAnnouncement] = useState("");
    const [announcementKey, setAnnouncementKey] = useState(0);
    const lastAnnouncedRef = useRef<SnapPosition>(null);

    const assignRef = useCallback(
      (instance: BaseWindowInstance) => {
        innerRef.current = instance;
        if (!forwardedRef) return;
        if (typeof forwardedRef === "function") {
          forwardedRef(instance);
        } else {
          (forwardedRef as MutableRef<BaseWindowInstance>).current = instance;
        }
      },
      [forwardedRef],
    );

    const overlayZones = useMemo<OverlayZone[]>(() => {
      if (!dragContext) return [];
      const {
        viewportWidth,
        viewportHeight,
        topInset,
        snapBottomInset,
        regions,
      } = dragContext;
      if (!viewportWidth || !viewportHeight) {
        return [];
      }
      const normalizedTop = typeof topInset === "number" ? topInset : measureWindowTopOffset();
      const computedRegions =
        regions ||
        computeExtendedSnapRegions(
          viewportWidth,
          viewportHeight,
          normalizedTop,
          typeof snapBottomInset === "number" ? snapBottomInset : undefined,
        );

      return Object.entries(computedRegions).map(([id, rect]) => ({
        id,
        rect: rect as SnapRegion,
        label: getSnapPreviewLabel(id),
      }));
    }, [dragContext]);

    const overlayVisible = dragging && overlayZones.length > 0;

    const handleDragStateChange = useCallback(
      (active: boolean, context?: SnapContext | null) => {
        setDragging(active);
        if (context) {
          setDragContext(context);
        } else if (!active) {
          setDragContext(null);
        }
        if (!active) {
          setActivePreview(null);
        }
      },
      [],
    );

    const handleSnapPreviewChange = useCallback(
      (position: SnapPosition, _preview?: SnapRegion | null, context?: SnapContext | null) => {
        if (context) {
          setDragContext(context);
        }
        setActivePreview(position ?? null);
      },
      [],
    );

    const handleSnapStateChange = useCallback(
      (position: SnapPosition, _region?: SnapRegion | null) => {
        const normalized = position ?? null;
        if (lastAnnouncedRef.current !== normalized) {
          lastAnnouncedRef.current = normalized;
          const message = getSnapAnnouncement(normalized);
          setAnnouncement(message);
          setAnnouncementKey((key) => key + 1);
        }
        if (typeof onSnapChange === "function") {
          onSnapChange(normalized);
        }
        setDragging(false);
        setActivePreview(null);
        setDragContext(null);
      },
      [onSnapChange],
    );

    const clampToViewport = useCallback(() => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;

      const rect = node.getBoundingClientRect();
      const topOffset = measureWindowTopOffset();
      const storedPosition = readNodePosition(node);
      const fallbackPosition = {
        x: typeof restProps.initialX === "number" ? restProps.initialX : 0,
        y: clampWindowTopPosition(restProps.initialY, topOffset),
      };
      const currentPosition = storedPosition || fallbackPosition;
      const clamped = clampWindowPositionWithinViewport(currentPosition, rect, {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        topOffset,
      });
      if (!clamped) return;
      if (clamped.x === currentPosition.x && clamped.y === currentPosition.y) {
        return;
      }

      node.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
      if (typeof node.style.setProperty === "function") {
        node.style.setProperty("--window-transform-x", `${clamped.x}px`);
        node.style.setProperty("--window-transform-y", `${clamped.y}px`);
      } else {
        (node.style as unknown as Record<string, string>)["--window-transform-x"] = `${clamped.x}px`;
        (node.style as unknown as Record<string, string>)["--window-transform-y"] = `${clamped.y}px`;
      }

      if (typeof restProps.onPositionChange === "function") {
        restProps.onPositionChange(clamped.x, clamped.y);
      }
    }, [restProps.initialX, restProps.initialY, restProps.onPositionChange]);

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handler = () => clampToViewport();
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("resize", handler);
      };
    }, [clampToViewport]);

    return (
      <>
        {overlayVisible && (
          <div className="pointer-events-none fixed inset-0 z-[45]">
            {overlayZones.map((zone) => {
              const isActive = activePreview === zone.id;
              const baseClass = "absolute rounded-lg border transition-all duration-150 ease-out";
              const stateClass = isActive
                ? "border-sky-300/70 bg-sky-500/20 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]"
                : "border-slate-500/30 bg-slate-900/10";
              return (
                <div
                  key={zone.id}
                  className={`${baseClass} ${stateClass}`}
                  style={{
                    left: `${zone.rect.left}px`,
                    top: `${zone.rect.top}px`,
                    width: `${zone.rect.width}px`,
                    height: `${zone.rect.height}px`,
                  }}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        )}
        <BaseWindow
          ref={assignRef}
          {...restProps}
          onDragStateChange={handleDragStateChange}
          onSnapPreviewChange={handleSnapPreviewChange}
          onSnapStateChange={handleSnapStateChange}
        />
        <div key={announcementKey} aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
      </>
    );
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
