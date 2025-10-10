"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DragEvent as ReactDragEvent, KeyboardEvent, ReactNode } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import type { DraggableData, DraggableEventHandler } from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import {
  clampWindowTopPosition,
  DEFAULT_WINDOW_TOP_OFFSET,
  measureSafeAreaInset,
  measureWindowTopOffset,
} from '../../utils/windowLayout';
import styles from './window.module.css';
import { DESKTOP_TOP_PADDING, SNAP_BOTTOM_INSET } from '../../utils/uiConstants';
import {
  EDGE_THRESHOLD_MIN,
  EDGE_THRESHOLD_MAX,
  EDGE_THRESHOLD_RATIO,
  EDGE_RESISTANCE_DISTANCE,
  EDGE_RESISTANCE_FACTOR,
  SNAP_GRID_SIZE,
} from './window.constants';
import type {
  SnapPosition,
  SnapRegion,
  WindowGeometry,
  WindowHandle,
  WindowMainScreenProps,
  WindowProps,
  WindowState,
} from '../../types/window';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const computeEdgeThreshold = (size: number) => clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

const percentOf = (value: number, total: number) => (total ? (value / total) * 100 : 0);

const computeSnapRegions = (
  viewportWidth: number,
  viewportHeight: number,
  topInset: number = DEFAULT_WINDOW_TOP_OFFSET,
): Record<SnapPosition, SnapRegion> => {
  const halfWidth = viewportWidth / 2;
  const normalizedTopInset = Number.isFinite(topInset)
    ? Math.max(topInset, DESKTOP_TOP_PADDING)
    : DEFAULT_WINDOW_TOP_OFFSET;
  const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
  const availableHeight = Math.max(0, viewportHeight - normalizedTopInset - SNAP_BOTTOM_INSET - safeBottom);
  const topHeight = Math.min(availableHeight, Math.max(viewportHeight / 2, 0));
  return {
    left: { left: 0, top: normalizedTopInset, width: halfWidth, height: availableHeight },
    right: { left: viewportWidth - halfWidth, top: normalizedTopInset, width: halfWidth, height: availableHeight },
    top: { left: 0, top: normalizedTopInset, width: viewportWidth, height: topHeight },
  };
};

interface StartPosition {
  x: number;
  y: number;
}

const ensureElement = (value?: string | HTMLElement | null) => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (typeof document === 'undefined') return null;
    return document.getElementById(value);
  }
  return value;
};

const Window = forwardRef<WindowHandle, WindowProps>((props, ref) => {
  const {
    id,
    title,
    screen,
    addFolder,
    context,
    allowMaximize,
    defaultWidth,
    defaultHeight,
    initialX,
    initialY,
    minimized,
    isFocused,
    resizable,
    snapEnabled,
    overlayRoot,
    zIndex,
    onPositionChange,
    focus,
    hasMinimised,
    closed,
    openApp,
  } = props;

  const isClient = typeof window !== 'undefined';
  const initialMetrics = useMemo(() => {
    const topInset = isClient ? measureWindowTopOffset() : DEFAULT_WINDOW_TOP_OFFSET;
    const portrait = isClient ? window.innerHeight > window.innerWidth : false;
    const startingWidth = typeof defaultWidth === 'number' ? defaultWidth : portrait ? 90 : 60;
    const startingHeight = typeof defaultHeight === 'number' ? defaultHeight : 85;
    const startXPosition = typeof initialX === 'number'
      ? initialX
      : isClient
        ? portrait
          ? window.innerWidth * 0.05
          : 60
        : 60;
    const startYPosition = clampWindowTopPosition(initialY, topInset);
    return {
      topInset,
      startingWidth,
      startingHeight,
      startPosition: { x: startXPosition, y: startYPosition } as StartPosition,
    };
  }, [defaultHeight, defaultWidth, initialX, initialY, isClient]);

  const [state, setStateInternal] = useState<WindowState>(() => ({
    cursorType: 'cursor-default',
    width: initialMetrics.startingWidth,
    height: initialMetrics.startingHeight,
    closed: false,
    maximized: false,
    parentSize: { height: 100, width: 100 },
    safeAreaTop: initialMetrics.topInset,
    snapPreview: null,
    snapPosition: null,
    snapped: null,
    lastSize: null,
    grabbed: false,
  }));

  const stateRef = useRef(state);
  const setState = useCallback(
    (update: Partial<WindowState> | ((prev: WindowState) => WindowState)) => {
      setStateInternal(prev => {
        const next = typeof update === 'function' ? (update as (prev: WindowState) => WindowState)(prev) : { ...prev, ...update };
        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  const windowRef = useRef<HTMLDivElement | null>(null);
  const startPositionRef = useRef<StartPosition>(initialMetrics.startPosition);
  const usageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuOpenerRef = useRef<Element | null>(null);
  const uiExperiments = useMemo(() => process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true', []);

  const applyDefaultWindowDimensions = useCallback(() => {
    if (!isClient) return;
    const portrait = window.innerHeight > window.innerWidth;
    if (typeof defaultHeight === 'number' && typeof defaultWidth === 'number') {
      setState({ height: defaultHeight, width: defaultWidth });
      return;
    }
    if (portrait) {
      startPositionRef.current = { ...startPositionRef.current, x: window.innerWidth * 0.05 };
      setState({ height: 85, width: 90 });
    } else if (window.innerWidth < 640) {
      setState({ height: 60, width: 85 });
    } else {
      setState({ height: 85, width: 60 });
    }
  }, [defaultHeight, defaultWidth, isClient, setState]);

  const getWindowNode = useCallback((): HTMLElement | null => {
    if (windowRef.current) {
      return windowRef.current;
    }
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById(id);
  }, [id]);

  const clearUsageTimeout = useCallback(() => {
    const handle = usageTimeoutRef.current;
    if (handle) {
      clearTimeout(handle);
      usageTimeoutRef.current = null;
    }
  }, []);

  const computeContentUsage = useCallback(() => {
    const root = getWindowNode();
    if (!root) return 100;
    const container = root.querySelector<HTMLElement>('.windowMainScreen');
    if (!container) return 100;
    const inner = (container.firstElementChild as HTMLElement | null) ?? container;
    const innerRect = inner.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const area = containerRect.width * containerRect.height;
    if (area === 0) return 100;
    return (innerRect.width * innerRect.height) / area * 100;
  }, [getWindowNode]);

  const optimizeWindow = useCallback(() => {
    const root = getWindowNode();
    if (!root) return;
    const container = root.querySelector<HTMLElement>('.windowMainScreen');
    if (!container) return;
    container.style.padding = '0px';

    const shrink = () => {
      const usage = computeContentUsage();
      if (usage >= 80) return;
      setState(prev => {
        const nextWidth = Math.max(prev.width - 1, 20);
        const nextHeight = Math.max(prev.height - 1, 20);
        return { ...prev, width: nextWidth, height: nextHeight };
      });
      if (computeContentUsage() < 80) {
        setTimeout(shrink, 50);
      }
    };

    shrink();
  }, [computeContentUsage, getWindowNode, setState]);

  const scheduleUsageCheck = useCallback(() => {
    clearUsageTimeout();
    usageTimeoutRef.current = setTimeout(() => {
      const usage = computeContentUsage();
      if (usage < 65) {
        optimizeWindow();
      }
    }, 200);
  }, [clearUsageTimeout, computeContentUsage, optimizeWindow]);

  const resizeBoundaries = useCallback(() => {
    if (!isClient) return;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const topInset = measureWindowTopOffset();
    const windowHeightPx = viewportHeight * (stateRef.current.height / 100.0);
    const windowWidthPx = viewportWidth * (stateRef.current.width / 100.0);
    const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const availableVertical = Math.max(viewportHeight - topInset - SNAP_BOTTOM_INSET - safeAreaBottom, 0);
    const availableHorizontal = Math.max(viewportWidth - windowWidthPx, 0);
    const maxTop = Math.max(availableVertical - windowHeightPx, 0);

    setState(prev => ({
      ...prev,
      parentSize: { height: maxTop, width: availableHorizontal },
      safeAreaTop: topInset,
    }));

    if (uiExperiments) {
      scheduleUsageCheck();
    }
  }, [isClient, scheduleUsageCheck, setState, uiExperiments]);

  const setTransformMotionPreset = useCallback((node: HTMLElement | null, preset: 'maximize' | 'restore' | 'snap') => {
    if (!node) return;
    const durationVars: Record<'maximize' | 'restore' | 'snap', string> = {
      maximize: '--window-motion-duration-maximize',
      restore: '--window-motion-duration-restore',
      snap: '--window-motion-duration-snap',
    };
    const easingVars: Record<'maximize' | 'restore' | 'snap', string> = {
      maximize: '--window-motion-ease-maximize',
      restore: '--window-motion-ease-restore',
      snap: '--window-motion-ease-snap',
    };
    const duration = durationVars[preset] ?? durationVars.restore;
    const easing = easingVars[preset] ?? easingVars.restore;
    node.style.setProperty('--window-motion-transform-duration', `var(${duration})`);
    node.style.setProperty('--window-motion-transform-easing', `var(${easing})`);
  }, []);

  const activateOverlay = useCallback(() => {
    const root = ensureElement(overlayRoot) ?? (typeof document !== 'undefined' ? document.getElementById('__next') : null);
    if (root) {
      root.setAttribute('inert', '');
    }
    menuOpenerRef.current = typeof document !== 'undefined' ? document.activeElement : null;
  }, [overlayRoot]);

  const deactivateOverlay = useCallback(() => {
    const root = ensureElement(overlayRoot) ?? (typeof document !== 'undefined' ? document.getElementById('__next') : null);
    if (root) {
      root.removeAttribute('inert');
    }
    const opener = menuOpenerRef.current;
    if (opener && 'focus' in opener && typeof opener.focus === 'function') {
      opener.focus();
    }
    menuOpenerRef.current = null;
  }, [overlayRoot]);

  const changeCursorToDefault = useCallback(() => {
    setState({ cursorType: 'cursor-default', grabbed: false });
  }, [setState]);

  const snapToGrid = useCallback(
    (value: number) => {
      if (!snapEnabled) return value;
      return Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
    },
    [snapEnabled],
  );

  const setWindowPosition = useCallback(() => {
    const node = getWindowNode();
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const topInset = stateRef.current.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
    const snappedX = snapToGrid(rect.x);
    const relativeY = rect.y - topInset;
    const snappedRelativeY = snapToGrid(relativeY);
    const absoluteY = clampWindowTopPosition(snappedRelativeY + topInset, topInset);
    node.style.setProperty('--window-transform-x', `${snappedX.toFixed(1)}px`);
    node.style.setProperty('--window-transform-y', `${absoluteY.toFixed(1)}px`);

    if (onPositionChange) {
      onPositionChange(snappedX, absoluteY);
    }
  }, [getWindowNode, onPositionChange, snapToGrid]);

  const restoreWindow = useCallback(() => {
    const node = getWindowNode();
    if (!node || !isClient) return;
    if (allowMaximize === false) return;
    applyDefaultWindowDimensions();
    const topOffset = measureWindowTopOffset();
    startPositionRef.current = {
      x: parseFloat(node.style.getPropertyValue('--window-transform-x')) || startPositionRef.current.x,
      y: parseFloat(node.style.getPropertyValue('--window-transform-y')) || startPositionRef.current.y,
    };
    const endTransform = `translate(${startPositionRef.current.x}px,${startPositionRef.current.y}px)`;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setTransformMotionPreset(node, 'restore');
    node.style.transform = endTransform;
    if (prefersReducedMotion) {
      setState({ maximized: false });
      return;
    }
    setState(prev => ({ ...prev, maximized: false }));
    resizeBoundaries();
  }, [allowMaximize, applyDefaultWindowDimensions, getWindowNode, isClient, resizeBoundaries, setState, setTransformMotionPreset]);

  const unsnapWindow = useCallback(() => {
    if (!stateRef.current.snapped) return;
    const node = getWindowNode();
    if (node) {
      setTransformMotionPreset(node, 'snap');
      const x = node.style.getPropertyValue('--window-transform-x');
      const y = node.style.getPropertyValue('--window-transform-y');
      if (x && y) {
        node.style.transform = `translate(${x},${y})`;
      }
    }
    const { lastSize } = stateRef.current;
    if (lastSize) {
      setState({
        width: lastSize.width,
        height: lastSize.height,
        snapped: null,
      });
    } else {
      setState({ snapped: null });
    }
    resizeBoundaries();
  }, [getWindowNode, resizeBoundaries, setState, setTransformMotionPreset]);

  const focusWindow = useCallback(() => {
    focus(id);
  }, [focus, id]);

  const changeCursorToMove = useCallback(() => {
    focusWindow();
    const { maximized, snapped } = stateRef.current;
    if (maximized) {
      restoreWindow();
    }
    if (snapped) {
      unsnapWindow();
    }
    setState({ cursorType: 'cursor-move', grabbed: true });
  }, [focusWindow, restoreWindow, setState, unsnapWindow]);

  const handleVerticalResize = useCallback(() => {
    if (resizable === false || !isClient) return;
    const px = (stateRef.current.height / 100) * window.innerHeight + 1;
    const snapped = snapToGrid(px);
    const heightPercent = (snapped / window.innerHeight) * 100;
    setState({ height: heightPercent });
    resizeBoundaries();
  }, [isClient, resizable, resizeBoundaries, setState, snapToGrid]);

  const handleHorizontalResize = useCallback(() => {
    if (resizable === false || !isClient) return;
    const px = (stateRef.current.width / 100) * window.innerWidth + 1;
    const snapped = snapToGrid(px);
    const widthPercent = (snapped / window.innerWidth) * 100;
    setState({ width: widthPercent });
    resizeBoundaries();
  }, [isClient, resizable, resizeBoundaries, setState, snapToGrid]);

  const snapWindow = useCallback(
    (position: SnapPosition) => {
      setWindowPosition();
      focusWindow();
      if (!isClient) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const topInset = stateRef.current.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
      if (!viewportWidth || !viewportHeight) return;
      const regions = computeSnapRegions(viewportWidth, viewportHeight, topInset);
      const region = regions[position];
      if (!region) return;
      const node = getWindowNode();
      if (node) {
        const offsetTop = region.top - DESKTOP_TOP_PADDING;
        setTransformMotionPreset(node, 'snap');
        node.style.transform = `translate(${region.left}px, ${offsetTop}px)`;
      }
      setState(prev => ({
        ...prev,
        snapPreview: null,
        snapPosition: null,
        snapped: position,
        lastSize: { width: prev.width, height: prev.height },
        width: percentOf(region.width, viewportWidth),
        height: percentOf(region.height, viewportHeight),
      }));
      resizeBoundaries();
    },
    [focusWindow, getWindowNode, isClient, resizeBoundaries, setState, setTransformMotionPreset, setWindowPosition],
  );

  const applyEdgeResistance = useCallback(
    (node: HTMLElement | null, data?: DraggableData) => {
      if (!node || !data) return;
      const topBound = stateRef.current.safeAreaTop ?? 0;
      const maxX = stateRef.current.parentSize.width;
      const maxY = topBound + stateRef.current.parentSize.height;

      const resist = (pos: number, min: number, max: number) => {
        if (pos < min) return min;
        if (pos < min + EDGE_RESISTANCE_DISTANCE) return min + (pos - min) * EDGE_RESISTANCE_FACTOR;
        if (pos > max) return max;
        if (pos > max - EDGE_RESISTANCE_DISTANCE) return max - (max - pos) * EDGE_RESISTANCE_FACTOR;
        return pos;
      };

      const x = resist(data.x, 0, maxX);
      const y = resist(data.y, topBound, maxY);
      node.style.transform = `translate(${x}px, ${y}px)`;
    },
    [],
  );

  const checkSnapPreview = useCallback(() => {
    const node = getWindowNode();
    if (!node || !isClient) return;
    const rect = node.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (!viewportWidth || !viewportHeight) return;

    const horizontalThreshold = computeEdgeThreshold(viewportWidth);
    const verticalThreshold = computeEdgeThreshold(viewportHeight);
    const topInset = stateRef.current.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
    const regions = computeSnapRegions(viewportWidth, viewportHeight, topInset);

    let candidate: { position: SnapPosition; preview: SnapRegion } | null = null;
    if (rect.top <= topInset + verticalThreshold && regions.top.height > 0) {
      candidate = { position: 'top', preview: regions.top };
    } else if (rect.left <= horizontalThreshold && regions.left.width > 0) {
      candidate = { position: 'left', preview: regions.left };
    } else if (viewportWidth - rect.right <= horizontalThreshold && regions.right.width > 0) {
      candidate = { position: 'right', preview: regions.right };
    }

    if (candidate) {
      const { position, preview } = candidate;
      const samePosition = stateRef.current.snapPosition === position;
      const currentPreview = stateRef.current.snapPreview;
      const samePreview =
        currentPreview &&
        currentPreview.left === preview.left &&
        currentPreview.top === preview.top &&
        currentPreview.width === preview.width &&
        currentPreview.height === preview.height;
      if (!samePosition || !samePreview) {
        setState({ snapPreview: preview, snapPosition: position });
      }
    } else if (stateRef.current.snapPreview) {
      setState({ snapPreview: null, snapPosition: null });
    }
  }, [getWindowNode, isClient, setState]);

  const handleDrag: DraggableEventHandler = useCallback(
    (_event, data) => {
      if (data && data.node) {
        applyEdgeResistance(data.node as HTMLElement, data);
      }
      checkSnapPreview();
    },
    [applyEdgeResistance, checkSnapPreview],
  );

  const handleStop = useCallback(() => {
    changeCursorToDefault();
    const snapPos = stateRef.current.snapPosition;
    if (snapPos) {
      snapWindow(snapPos);
    } else {
      setState({ snapPreview: null, snapPosition: null });
    }
  }, [changeCursorToDefault, snapWindow, setState]);

  const minimizeWindow = useCallback(() => {
    setWindowPosition();
    hasMinimised(id);
  }, [hasMinimised, id, setWindowPosition]);

  const maximizeWindow = useCallback(() => {
    if (allowMaximize === false) return;
    if (stateRef.current.maximized) {
      restoreWindow();
      return;
    }
    focusWindow();
    const node = getWindowNode();
    if (!node || !isClient) return;
    setWindowPosition();
    const viewportHeight = window.innerHeight;
    const topOffset = measureWindowTopOffset();
    const availableHeight = Math.max(0, viewportHeight - topOffset - SNAP_BOTTOM_INSET - Math.max(0, measureSafeAreaInset('bottom')));
    const heightPercent = percentOf(availableHeight, viewportHeight);
    setTransformMotionPreset(node, 'maximize');
    const translateYOffset = topOffset - DESKTOP_TOP_PADDING;
    node.style.transform = `translate(-1pt, ${translateYOffset}px)`;
    setState({ maximized: true, height: heightPercent, width: 100.2 });
  }, [allowMaximize, focusWindow, getWindowNode, isClient, setState, setTransformMotionPreset, setWindowPosition]);

  const closeWindow = useCallback(() => {
    setWindowPosition();
    setState({ closed: true });
    deactivateOverlay();
    setTimeout(() => {
      closed(id);
    }, 300);
  }, [closed, deactivateOverlay, id, setState, setWindowPosition]);

  const handleTitleBarKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (stateRef.current.grabbed) {
          handleStop();
        } else {
          changeCursorToMove();
        }
      } else if (stateRef.current.grabbed) {
        const step = 10;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          e.stopPropagation();
          const node = getWindowNode();
          if (node) {
            const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(node.style.transform);
            let x = match ? parseFloat(match[1]) : 0;
            let y = match ? parseFloat(match[2]) : 0;
            x += dx;
            y += dy;
            node.style.transform = `translate(${x}px, ${y}px)`;
            checkSnapPreview();
            setWindowPosition();
          }
        }
      }
    },
    [changeCursorToMove, checkSnapPreview, getWindowNode, handleStop, setWindowPosition],
  );

  const releaseGrab = useCallback(() => {
    if (stateRef.current.grabbed) {
      handleStop();
    }
  }, [handleStop]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        closeWindow();
      } else if (e.key === 'Tab') {
        focusWindow();
      } else if (e.altKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          unsnapWindow();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          snapWindow('left');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          snapWindow('right');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          snapWindow('top');
        }
        focusWindow();
      } else if (e.shiftKey) {
        const step = 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          setState(prev => ({ ...prev, width: Math.max(prev.width - step, 20) }));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          setState(prev => ({ ...prev, width: Math.min(prev.width + step, 100) }));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setState(prev => ({ ...prev, height: Math.max(prev.height - step, 20) }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setState(prev => ({ ...prev, height: Math.min(prev.height + step, 100) }));
        }
        focusWindow();
      }
    },
    [closeWindow, focusWindow, setState, snapWindow, unsnapWindow],
  );

  const handleSuperArrow = useCallback(
    (e: Event | CustomEvent<string>) => {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      if (detail === 'ArrowLeft') {
        if (stateRef.current.snapped === 'left') unsnapWindow();
        else snapWindow('left');
      } else if (detail === 'ArrowRight') {
        if (stateRef.current.snapped === 'right') unsnapWindow();
        else snapWindow('right');
      } else if (detail === 'ArrowUp') {
        maximizeWindow();
      } else if (detail === 'ArrowDown') {
        if (stateRef.current.maximized) {
          restoreWindow();
        } else if (stateRef.current.snapped) {
          unsnapWindow();
        }
      }
    },
    [maximizeWindow, restoreWindow, snapWindow, unsnapWindow],
  );

  useImperativeHandle(
    ref,
    () => ({
      getWindowNode,
      handleSuperArrow,
      handleDrag: (...args: Parameters<typeof handleDrag>) => handleDrag(...args),
      handleStop,
      handleKeyDown,
      changeCursorToMove,
      activateOverlay,
      closeWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      setWindowPosition,
      state,
    }),
    [
      activateOverlay,
      changeCursorToMove,
      closeWindow,
      getWindowNode,
      handleDrag,
      handleKeyDown,
      handleStop,
      handleSuperArrow,
      maximizeWindow,
      minimizeWindow,
      restoreWindow,
      setWindowPosition,
      state,
    ],
  );

  useEffect(() => {
    if (!isClient) return undefined;
    ReactGA.send({ hitType: 'pageview', page: `/${id}`, title: 'Custom Title' });
    resizeBoundaries();
    window.addEventListener('resize', resizeBoundaries);
    window.addEventListener('context-menu-open', activateOverlay);
    window.addEventListener('context-menu-close', deactivateOverlay);
    const root = getWindowNode();
    root?.addEventListener('super-arrow', handleSuperArrow as EventListener);
    if (uiExperiments) {
      scheduleUsageCheck();
    }
    return () => {
      ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
      window.removeEventListener('resize', resizeBoundaries);
      window.removeEventListener('context-menu-open', activateOverlay);
      window.removeEventListener('context-menu-close', deactivateOverlay);
      root?.removeEventListener('super-arrow', handleSuperArrow as EventListener);
      clearUsageTimeout();
    };
  }, [activateOverlay, deactivateOverlay, getWindowNode, handleSuperArrow, id, isClient, resizeBoundaries, scheduleUsageCheck, uiExperiments, clearUsageTimeout]);

  useEffect(() => {
    applyDefaultWindowDimensions();
    resizeBoundaries();
  }, [applyDefaultWindowDimensions, resizeBoundaries]);

  useEffect(() => () => clearUsageTimeout(), [clearUsageTimeout]);

  const handleStart: DraggableEventHandler = useCallback(
    () => {
      changeCursorToMove();
    },
    [changeCursorToMove],
  );

  const computedZIndex = typeof zIndex === 'number' ? zIndex : isFocused ? 30 : 20;
  const pip = () => screen(addFolder, openApp, context);

  return (
    <>
      {state.snapPreview && (
        <div
          data-testid="snap-preview"
          className={`fixed border-2 border-dashed border-white bg-white bg-opacity-10 pointer-events-none z-40 transition-opacity ${styles.snapPreview}`}
          style={{
            left: `${state.snapPreview.left}px`,
            top: `${state.snapPreview.top}px`,
            width: `${state.snapPreview.width}px`,
            height: `${state.snapPreview.height}px`,
            backdropFilter: 'brightness(1.2)',
            WebkitBackdropFilter: 'brightness(1.2)',
          }}
        />
      )}
      <Draggable
        nodeRef={windowRef}
        axis="both"
        handle=".bg-ub-window-title"
        defaultClassNameDragging="cursor-move"
        defaultClassNameDragged=""
        onStart={handleStart}
        onStop={handleStop}
        onDrag={handleDrag}
        grid={snapEnabled ? [SNAP_GRID_SIZE, SNAP_GRID_SIZE] : [1, 1]}
        bounds={{
          left: 0,
          top: state.safeAreaTop,
          right: state.parentSize.width,
          bottom: state.safeAreaTop + state.parentSize.height,
        }}
        scale={1}
        allowAnyClick={false}
        defaultPosition={{ x: startPositionRef.current.x, y: startPositionRef.current.y }}
      >
        <div
          ref={windowRef}
          className={[
            state.cursorType,
            state.closed ? 'closed-window' : '',
            minimized ? styles.windowFrameMinimized : '',
            state.grabbed ? 'opacity-70' : '',
            state.snapPreview ? 'ring-2 ring-blue-400' : '',
            'opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute flex flex-col window-shadow',
            styles.windowFrame,
            isFocused ? styles.windowFrameActive : styles.windowFrameInactive,
            state.maximized ? styles.windowFrameMaximized : '',
          ]
            .filter(Boolean)
            .join(' ')}
          id={id}
          role="dialog"
          aria-label={title}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={focusWindow}
          onFocus={focusWindow}
          style={{
            zIndex: computedZIndex,
            width: `${state.width}%`,
            height: `${state.height}%`,
          }}
        >
          {resizable !== false && <WindowYBorder resize={handleHorizontalResize} />}
          {resizable !== false && <WindowXBorder resize={handleVerticalResize} />}
          <WindowTopBar title={title} onKeyDown={handleTitleBarKeyDown} onBlur={releaseGrab} grabbed={state.grabbed} onPointerDown={focusWindow} />
          <WindowEditButtons
            minimize={minimizeWindow}
            maximize={maximizeWindow}
            isMaximised={state.maximized}
            close={closeWindow}
            id={id}
            allowMaximize={allowMaximize !== false}
            pip={pip}
          />
          {id === 'settings' ? (
            <Settings />
          ) : (
            <WindowMainScreen
              screen={screen}
              addFolder={id === 'terminal' ? addFolder ?? null : null}
              openApp={openApp}
              context={context}
            />
          )}
        </div>
      </Draggable>
    </>
  );
});

Window.displayName = 'Window';

export default Window;

interface WindowTopBarProps {
  title: string;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onBlur: () => void;
  grabbed: boolean;
  onPointerDown: () => void;
}

export function WindowTopBar({ title, onKeyDown, onBlur, grabbed, onPointerDown }: WindowTopBarProps) {
  return (
    <div
      className={`${styles.windowTitlebar} relative bg-ub-window-title px-3 text-white w-full select-none flex items-center`}
      tabIndex={0}
      role="button"
      aria-grabbed={grabbed}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPointerDown={onPointerDown}
    >
      <div className="flex justify-center w-full text-sm font-bold">{title}</div>
    </div>
  );
}

interface WindowBorderProps {
  resize: () => void;
}

function useTransparentImage() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const img = new window.Image(0, 0);
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    img.style.opacity = '0';
    imageRef.current = img;
  }, []);
  return imageRef;
}

export function WindowYBorder({ resize }: WindowBorderProps) {
  const imageRef = useTransparentImage();
  return (
    <div
      className={`${styles.windowYBorder} cursor-[e-resize] border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
      draggable
      onDragStart={(event: ReactDragEvent<HTMLDivElement>) => {
        const img = imageRef.current;
        if (img) {
          event.dataTransfer?.setDragImage(img, 0, 0);
        }
      }}
      onDrag={() => resize()}
    />
  );
}

export function WindowXBorder({ resize }: WindowBorderProps) {
  const imageRef = useTransparentImage();
  return (
    <div
      className={`${styles.windowXBorder} cursor-[n-resize] border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
      draggable
      onDragStart={(event: ReactDragEvent<HTMLDivElement>) => {
        const img = imageRef.current;
        if (img) {
          event.dataTransfer?.setDragImage(img, 0, 0);
        }
      }}
      onDrag={() => resize()}
    />
  );
}

interface WindowEditButtonsProps {
  minimize: () => void;
  maximize: () => void;
  isMaximised: boolean;
  close: () => void;
  id: string;
  allowMaximize: boolean;
  pip?: () => ReactNode;
}

export function WindowEditButtons({ minimize, maximize, isMaximised, close, id, allowMaximize, pip }: WindowEditButtonsProps) {
  const { togglePin } = useDocPiP(pip || (() => null));
  const pipSupported = typeof window !== 'undefined' && Boolean(window.documentPictureInPicture);
  return (
    <div className={`${styles.windowControls} absolute select-none right-0 top-0 mr-1 flex justify-center items-center min-w-[8.25rem]`}>
      {pipSupported && pip && (
        <button
          type="button"
          aria-label="Window pin"
          className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
          onClick={togglePin}
        >
          <NextImage
            src="/themes/Yaru/window/window-pin-symbolic.svg"
            alt="Kali window pin"
            className="h-4 w-4 inline"
            width={16}
            height={16}
            sizes="16px"
          />
        </button>
      )}
      <button
        type="button"
        aria-label="Window minimize"
        className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
        onClick={minimize}
      >
        <NextImage
          src="/themes/Yaru/window/window-minimize-symbolic.svg"
          alt="Kali window minimize"
          className="h-4 w-4 inline"
          width={16}
          height={16}
          sizes="16px"
        />
      </button>
      {allowMaximize && (
        isMaximised ? (
          <button
            type="button"
            aria-label="Window restore"
            className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
            onClick={maximize}
          >
            <NextImage
              src="/themes/Yaru/window/window-restore-symbolic.svg"
              alt="Kali window restore"
              className="h-4 w-4 inline"
              width={16}
              height={16}
              sizes="16px"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Window maximize"
            className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
            onClick={maximize}
          >
            <NextImage
              src="/themes/Yaru/window/window-maximize-symbolic.svg"
              alt="Kali window maximize"
              className="h-4 w-4 inline"
              width={16}
              height={16}
              sizes="16px"
            />
          </button>
        )
      )}
      <button
        type="button"
        id={`close-${id}`}
        aria-label="Window close"
        className="mx-1 focus:outline-none cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center items-center h-6 w-6"
        onClick={close}
      >
        <NextImage
          src="/themes/Yaru/window/window-close-symbolic.svg"
          alt="Kali window close"
          className="h-4 w-4 inline"
          width={16}
          height={16}
          sizes="16px"
        />
      </button>
    </div>
  );
}

export function WindowMainScreen({ screen, addFolder, openApp, context }: WindowMainScreenProps) {
  const [hasDarkBackground, setHasDarkBackground] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasDarkBackground(true);
    }, 3000);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const resolvedAddFolder = addFolder ?? null;
  const resolvedOpenApp = openApp ?? (() => undefined);

  return (
    <div className={`w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen${hasDarkBackground ? ' bg-ub-drk-abrgn ' : ' bg-ub-cool-grey'}`}>
      {screen(resolvedAddFolder, resolvedOpenApp, context)}
    </div>
  );
}
