import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  clampWindowPositionWithinViewport,
  measureSafeAreaInset,
  measureSnapBottomInset,
  measureWindowTopOffset,
} from '../../utils/windowLayout';

const assignRef = (ref, value) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  try {
    // eslint-disable-next-line no-param-reassign
    ref.current = value;
  } catch (error) {
    // Ignore failures from read-only refs.
  }
};

const normalizeRect = (rect) => {
  if (!rect) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
  }

  const { left, top, width, height } = rect;
  return {
    left: Number.isFinite(left) ? left : 0,
    top: Number.isFinite(top) ? top : 0,
    width: Number.isFinite(width) ? Math.max(width, 0) : 0,
    height: Number.isFinite(height) ? Math.max(height, 0) : 0,
  };
};

const readViewport = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    viewportWidth: typeof window.innerWidth === 'number' ? window.innerWidth : undefined,
    viewportHeight: typeof window.innerHeight === 'number' ? window.innerHeight : undefined,
    topOffset: measureWindowTopOffset(),
    snapBottomInset: measureSnapBottomInset(),
    bottomInset: measureSafeAreaInset('bottom'),
  };
};

const computeClampedPosition = (state) => {
  if (!state) return null;
  const { bounds, deltaX, deltaY, viewport } = state;
  const target = {
    x: bounds.left + deltaX,
    y: bounds.top + deltaY,
  };

  const result = clampWindowPositionWithinViewport(
    target,
    { width: bounds.width, height: bounds.height },
    viewport,
  );

  if (!result) {
    return { x: target.x, y: target.y };
  }

  return result;
};

const WindowShell = React.forwardRef((props, forwardedRef) => {
  const {
    children,
    onBoundsCommit,
    onDragStart,
    onDragEnd,
  } = props;

  const frameRef = useRef(null);
  const titlebarRef = useRef(null);
  const dragStateRef = useRef(null);
  const rafRef = useRef(null);

  const assignFrameRef = useCallback((node) => {
    frameRef.current = node;
    assignRef(forwardedRef, node);
  }, [forwardedRef]);

  const assignTitlebarRef = useCallback((node) => {
    titlebarRef.current = node;
  }, []);

  const cancelScheduledFrame = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resetFrameTransform = useCallback((frameNode) => {
    const frame = frameNode ?? frameRef.current;
    if (!frame) return;
    frame.style.transform = '';
    frame.style.willChange = '';
  }, []);

  const flushTransform = useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    const frame = dragState.frame ?? frameRef.current;
    if (!frame) return;

    const position = computeClampedPosition(dragState);
    if (!position) return;

    dragState.lastPosition = position;
    const translateX = position.x - dragState.bounds.left;
    const translateY = position.y - dragState.bounds.top;

    frame.style.transform = `translate(${translateX}px, ${translateY}px)`;
  }, []);

  const scheduleTransformFlush = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      flushTransform();
    });
  }, [flushTransform]);

  const clearDragState = useCallback((options = {}) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    if (options.releaseCapture !== false) {
      dragState.captureTarget?.releasePointerCapture?.(dragState.pointerId);
    }

    cancelScheduledFrame();
    resetFrameTransform(dragState.frame);

    dragStateRef.current = null;
  }, [cancelScheduledFrame, resetFrameTransform]);

  const commitDrag = useCallback((dragState) => {
    if (!dragState) return;
    const finalPosition = dragState.lastPosition || computeClampedPosition(dragState);
    if (!finalPosition) return;

    if (typeof onBoundsCommit === 'function') {
      onBoundsCommit({ left: finalPosition.x, top: finalPosition.y });
    }
  }, [onBoundsCommit]);

  const handlePointerDown = useCallback((event) => {
    if (!event || event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const frame = frameRef.current;
    if (!frame) return;

    const rect = normalizeRect(frame.getBoundingClientRect?.());

    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      bounds: rect,
      viewport: readViewport(),
      lastPosition: { x: rect.left, y: rect.top },
      captureTarget: event.currentTarget,
      frame,
    };

    event.currentTarget?.setPointerCapture?.(event.pointerId);
    frame.style.willChange = 'transform';

    if (typeof onDragStart === 'function') {
      onDragStart();
    }
  }, [onDragStart]);

  const handlePointerMove = useCallback((event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    dragState.deltaX = event.clientX - dragState.startClientX;
    dragState.deltaY = event.clientY - dragState.startClientY;
    scheduleTransformFlush();
  }, [scheduleTransformFlush]);

  const handlePointerUp = useCallback((event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    cancelScheduledFrame();
    flushTransform();
    dragState.captureTarget?.releasePointerCapture?.(dragState.pointerId);

    resetFrameTransform(dragState.frame);

    if (typeof onDragEnd === 'function') {
      onDragEnd();
    }

    commitDrag(dragState);
    dragStateRef.current = null;
  }, [cancelScheduledFrame, commitDrag, flushTransform, onDragEnd, resetFrameTransform]);

  const handlePointerCancel = useCallback((event) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    clearDragState();

    if (typeof onDragEnd === 'function') {
      onDragEnd();
    }
  }, [clearDragState, onDragEnd]);

  useEffect(() => () => {
    clearDragState({ releaseCapture: true });
  }, [clearDragState]);

  const frameProps = useMemo(() => ({
    ref: assignFrameRef,
  }), [assignFrameRef]);

  const titlebarProps = useMemo(() => ({
    ref: assignTitlebarRef,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }), [assignTitlebarRef, handlePointerCancel, handlePointerDown, handlePointerMove, handlePointerUp]);

  if (typeof children === 'function') {
    return children({
      frameProps,
      titlebarProps,
      dragging: Boolean(dragStateRef.current),
    });
  }

  return null;
});

WindowShell.displayName = 'WindowShell';

export default WindowShell;
