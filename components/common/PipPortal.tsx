"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { getLayerZIndex } from '../../utils/zIndexManager';

type PipCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const PIP_CORNER_STORAGE_KEY = 'pip-portal.corner';
const SNAP_MARGIN = 16;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 180;

const CORNERS: PipCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const isCorner = (value: unknown): value is PipCorner =>
  typeof value === 'string' && (CORNERS as string[]).includes(value);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const computeCornerPosition = (
  corner: PipCorner,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) => {
  const maxLeft = Math.max(SNAP_MARGIN, viewportWidth - width - SNAP_MARGIN);
  const maxTop = Math.max(SNAP_MARGIN, viewportHeight - height - SNAP_MARGIN);

  const left = corner.endsWith('right') ? maxLeft : SNAP_MARGIN;
  const top = corner.startsWith('bottom') ? maxTop : SNAP_MARGIN;
  return { left, top };
};

const readStoredCorner = () => {
  if (typeof window === 'undefined') return 'bottom-right' as PipCorner;
  try {
    const stored = window.localStorage.getItem(PIP_CORNER_STORAGE_KEY);
    if (isCorner(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors and fall back
  }
  return 'bottom-right';
};

const persistCorner = (corner: PipCorner) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PIP_CORNER_STORAGE_KEY, corner);
  } catch {
    // ignore storage errors
  }
};

interface FrameState {
  left: number;
  top: number;
  width: number;
  height: number;
  corner: PipCorner;
}

const constrainSize = (width: number, height: number, viewportWidth: number, viewportHeight: number) => {
  const maxWidth = Math.max(MIN_WIDTH, viewportWidth - SNAP_MARGIN * 2);
  const maxHeight = Math.max(MIN_HEIGHT, viewportHeight - SNAP_MARGIN * 2);
  return {
    width: clamp(width, MIN_WIDTH, maxWidth),
    height: clamp(height, MIN_HEIGHT, maxHeight),
  };
};

const clampFrame = (frame: FrameState, viewportWidth: number, viewportHeight: number): FrameState => {
  const { width, height } = constrainSize(frame.width, frame.height, viewportWidth, viewportHeight);
  const maxLeft = Math.max(SNAP_MARGIN, viewportWidth - width - SNAP_MARGIN);
  const maxTop = Math.max(SNAP_MARGIN, viewportHeight - height - SNAP_MARGIN);
  return {
    left: clamp(frame.left, SNAP_MARGIN, maxLeft),
    top: clamp(frame.top, SNAP_MARGIN, maxTop),
    width,
    height,
    corner: frame.corner,
  };
};

const snapFrameToCorner = (
  frame: FrameState,
  viewportWidth: number,
  viewportHeight: number,
): FrameState => {
  const centerX = frame.left + frame.width / 2;
  const centerY = frame.top + frame.height / 2;
  const horizontal = centerX < viewportWidth / 2 ? 'left' : 'right';
  const vertical = centerY < viewportHeight / 2 ? 'top' : 'bottom';
  const corner = `${vertical}-${horizontal}` as PipCorner;
  const { width, height } = constrainSize(frame.width, frame.height, viewportWidth, viewportHeight);
  const { left, top } = computeCornerPosition(corner, width, height, viewportWidth, viewportHeight);
  return { left, top, width, height, corner };
};

const getFallbackInitialFrame = (): FrameState => {
  if (typeof window === 'undefined') {
    return {
      left: SNAP_MARGIN,
      top: SNAP_MARGIN,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      corner: 'bottom-right',
    };
  }
  const viewportWidth = window.innerWidth || DEFAULT_WIDTH;
  const viewportHeight = window.innerHeight || DEFAULT_HEIGHT;
  const { width, height } = constrainSize(DEFAULT_WIDTH, DEFAULT_HEIGHT, viewportWidth, viewportHeight);
  const storedCorner = readStoredCorner();
  const { left, top } = computeCornerPosition(storedCorner, width, height, viewportWidth, viewportHeight);
  return { left, top, width, height, corner: storedCorner };
};

interface FallbackPipWindowProps {
  children: React.ReactNode;
  onRequestClose: () => void;
}

const FallbackPipWindow: React.FC<FallbackPipWindowProps> = ({ children, onRequestClose }) => {
  const [frame, setFrame] = useState<FrameState>(() => getFallbackInitialFrame());
  const frameRef = useRef(frame);
  const operationRef = useRef<'drag' | 'resize' | null>(null);
  const gestureStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    left: frame.left,
    top: frame.top,
    width: frame.width,
    height: frame.height,
  });
  const restoreUserSelectRef = useRef<string | null>(null);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setFrame((prev) => clampFrame(prev, window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const releaseUserSelect = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (restoreUserSelectRef.current !== null) {
      document.body.style.userSelect = restoreUserSelectRef.current;
      restoreUserSelectRef.current = null;
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (typeof window === 'undefined') return;
      if (!operationRef.current) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const start = gestureStartRef.current;
      const deltaX = event.clientX - start.pointerX;
      const deltaY = event.clientY - start.pointerY;

      if (operationRef.current === 'drag') {
        const width = frameRef.current.width;
        const height = frameRef.current.height;
        const maxLeft = Math.max(SNAP_MARGIN, viewportWidth - width - SNAP_MARGIN);
        const maxTop = Math.max(SNAP_MARGIN, viewportHeight - height - SNAP_MARGIN);
        const left = clamp(start.left + deltaX, SNAP_MARGIN, maxLeft);
        const top = clamp(start.top + deltaY, SNAP_MARGIN, maxTop);
        const next = { ...frameRef.current, left, top };
        frameRef.current = next;
        setFrame(next);
      } else if (operationRef.current === 'resize') {
        const { width, height } = constrainSize(
          start.width + deltaX,
          start.height + deltaY,
          viewportWidth,
          viewportHeight,
        );
        const maxLeft = Math.max(SNAP_MARGIN, viewportWidth - width - SNAP_MARGIN);
        const maxTop = Math.max(SNAP_MARGIN, viewportHeight - height - SNAP_MARGIN);
        const left = clamp(frameRef.current.left, SNAP_MARGIN, maxLeft);
        const top = clamp(frameRef.current.top, SNAP_MARGIN, maxTop);
        const next = { ...frameRef.current, width, height, left, top };
        frameRef.current = next;
        setFrame(next);
      }
    },
    [],
  );

  const handlePointerEnd = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerEnd);
    window.removeEventListener('pointercancel', handlePointerEnd);
    window.removeEventListener('blur', handlePointerEnd);
    releaseUserSelect();
    operationRef.current = null;
    setFrame((current) => {
      const snapped = snapFrameToCorner(current, window.innerWidth, window.innerHeight);
      persistCorner(snapped.corner);
      frameRef.current = snapped;
      return snapped;
    });
  }, [handlePointerMove, releaseUserSelect]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', handlePointerEnd);
      releaseUserSelect();
    };
  }, [handlePointerEnd, handlePointerMove, releaseUserSelect]);

  const beginGesture = useCallback(
    (event: React.PointerEvent, mode: 'drag' | 'resize') => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      event.preventDefault();
      event.stopPropagation();
      operationRef.current = mode;
      gestureStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        left: frameRef.current.left,
        top: frameRef.current.top,
        width: frameRef.current.width,
        height: frameRef.current.height,
      };
      if (restoreUserSelectRef.current === null) {
        restoreUserSelectRef.current = document.body.style.userSelect || '';
      }
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
      window.addEventListener('blur', handlePointerEnd);
    },
    [handlePointerEnd, handlePointerMove],
  );

  const pipZIndex = useMemo(() => getLayerZIndex('pip'), []);

  return (
    <div
      style={{
        position: 'fixed',
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        zIndex: pipZIndex,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(12, 12, 14, 0.94)',
        boxShadow: 'var(--shadow-2, 0 12px 32px rgba(0,0,0,0.4))',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-live="polite"
    >
      <div
        onPointerDown={(event) => beginGesture(event, 'drag')}
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 72,
          height: 20,
          borderRadius: 10,
          background: 'rgba(255, 255, 255, 0.12)',
          color: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          letterSpacing: 0.08,
          textTransform: 'uppercase',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        Drag
      </div>
      <button
        type="button"
        onClick={onRequestClose}
        aria-label="Close picture-in-picture"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.14)',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: 36,
          padding: 8,
          overflow: 'auto',
          color: 'var(--color-text, #fff)',
        }}
      >
        {children}
      </div>
      <div
        onPointerDown={(event) => beginGesture(event, 'resize')}
        style={{
          position: 'absolute',
          right: 6,
          bottom: 6,
          width: 18,
          height: 18,
          borderRadius: 4,
          cursor: 'nwse-resize',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.25) 25%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.05) 50%)',
          backgroundSize: '8px 8px',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

// The Document Picture-in-Picture API is still experimental and the
// TypeScript definitions do not ship with the DOM lib yet.
interface PipPortalContextValue {
  open: (content: React.ReactNode) => Promise<Window | null>;
  close: () => void;
  isOpen: boolean;
}

export const PipPortalContext = createContext<PipPortalContextValue>({
  open: async () => null,
  close: () => {},
  isOpen: false,
});

export const usePipPortal = () => useContext(PipPortalContext);

/**
 * Provider that lets children render arbitrary content inside a
 * Document Picture-in-Picture window. The window remains controllable
 * through the returned `open` and `close` functions.
 */
const PipPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pipWindowRef = useRef<Window | null>(null);
  const fallbackContainerRef = useRef<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [content, setContent] = useState<React.ReactNode>(null);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    const win = pipWindowRef.current;
    if (win && !win.closed) {
      win.close();
    }
    pipWindowRef.current = null;
    if (fallbackContainerRef.current) {
      fallbackContainerRef.current.remove();
      fallbackContainerRef.current = null;
    }
    setContainer(null);
    setContent(null);
    setIsOpen(false);
  }, []);

  const openFallback = useCallback(
    (node: React.ReactNode) => {
      if (typeof document === 'undefined' || typeof window === 'undefined') return null;
      let fallbackRoot = fallbackContainerRef.current;
      if (!fallbackRoot) {
        fallbackRoot = document.createElement('div');
        fallbackRoot.dataset.pipFallback = 'true';
        document.body.appendChild(fallbackRoot);
        fallbackContainerRef.current = fallbackRoot;
      }
      pipWindowRef.current = null;
      setContainer(fallbackRoot);
      setIsOpen(true);
      setContent(
        <FallbackPipWindow key="pip-fallback" onRequestClose={close}>
          {node}
        </FallbackPipWindow>,
      );
      return window;
    },
    [close],
  );

  const open = useCallback(
    async (node: React.ReactNode) => {
      if (typeof window === 'undefined') return null;
      if (!window.documentPictureInPicture) {
        return openFallback(node);
      }

      let win = pipWindowRef.current;
      if (!win || win.closed) {
        try {
          win = await window.documentPictureInPicture.requestWindow();
        } catch {
          return openFallback(node);
        }
        pipWindowRef.current = win;
        const { document: pipDoc } = win;
        if (pipDoc) {
          pipDoc.documentElement.style.background = 'transparent';
          pipDoc.body.style.margin = '0';
          pipDoc.body.style.background = 'transparent';
          let root = pipDoc.getElementById('pip-portal-root');
          if (!root) {
            root = pipDoc.createElement('div');
            root.id = 'pip-portal-root';
            root.style.width = '100%';
            root.style.height = '100%';
            root.style.display = 'flex';
            root.style.alignItems = 'stretch';
            root.style.justifyContent = 'stretch';
            pipDoc.body.appendChild(root);
          }
          setContainer(root as HTMLElement);
        }

        const handlePageHide = () => close();
        window.addEventListener('pagehide', handlePageHide, { once: true });
        win.addEventListener('pagehide', handlePageHide, { once: true });
      }

      setIsOpen(true);
      setContent(node);
      return win;
    },
    [close, openFallback],
  );

  useEffect(() => {
    const win = pipWindowRef.current;
    if (!win) return;

    const handleUnload = () => {
      pipWindowRef.current = null;
      setContainer(null);
      setContent(null);
      setIsOpen(false);
    };

    win.addEventListener('unload', handleUnload);
    return () => {
      win.removeEventListener('unload', handleUnload);
    };
  }, [container]);

  useEffect(() => {
    return () => {
      if (fallbackContainerRef.current) {
        fallbackContainerRef.current.remove();
        fallbackContainerRef.current = null;
      }
    };
  }, []);

  return (
    <PipPortalContext.Provider value={{ open, close, isOpen }}>
      {children}
      {container && content ? createPortal(content, container) : null}
    </PipPortalContext.Provider>
  );
};

export default PipPortalProvider;

