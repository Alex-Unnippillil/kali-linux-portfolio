import React, { useMemo } from 'react';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import clsx from 'clsx';
import SnapOverlay, { SnapPreviewRect } from './overlay';
import styles from './window.module.css';

interface WindowFrameProps {
  id?: string | null;
  title: string;
  windowState: string;
  widthPercent: number;
  heightPercent: number;
  zIndex: number;
  cursorType: string;
  isClosed: boolean;
  minimized: boolean;
  isFocused: boolean;
  maximized: boolean;
  grabbed: boolean;
  snapEnabled: boolean;
  snapGrid: [number, number];
  snapPreview: SnapPreviewRect | null;
  snapLabel: string;
  startX: number;
  startY: number;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  onDragStart: DraggableEventHandler;
  onDrag: DraggableEventHandler;
  onDragStop: DraggableEventHandler;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onFocus: React.FocusEventHandler<HTMLDivElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  ariaHidden: boolean;
  children: React.ReactNode;
}

const WindowFrame = React.forwardRef<HTMLDivElement, WindowFrameProps>(
  (
    {
      id,
      title,
      windowState,
      widthPercent,
      heightPercent,
      zIndex,
      cursorType,
      isClosed,
      minimized,
      isFocused,
      maximized,
      grabbed,
      snapEnabled,
      snapGrid,
      snapPreview,
      snapLabel,
      startX,
      startY,
      bounds,
      onDragStart,
      onDrag,
      onDragStop,
      onPointerDown,
      onFocus,
      onKeyDown,
      ariaHidden,
      children,
    },
    ref,
  ) => {
    const frameClassName = useMemo(
      () =>
        clsx(
          cursorType,
          isClosed && 'closed-window',
          minimized && styles.windowFrameMinimized,
          grabbed && 'opacity-70',
          snapPreview && 'ring-2 ring-blue-400',
          'opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute flex flex-col window-shadow',
          styles.windowFrame,
          isFocused ? styles.windowFrameActive : styles.windowFrameInactive,
          maximized && styles.windowFrameMaximized,
        ),
      [cursorType, grabbed, isClosed, isFocused, maximized, minimized, snapPreview],
    );

    const style = useMemo(
      () => ({
        position: 'absolute' as const,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        zIndex,
      }),
      [heightPercent, widthPercent, zIndex],
    );

    const grid = snapEnabled ? snapGrid : [1, 1];

    return (
      <>
        {snapPreview ? <SnapOverlay preview={snapPreview} label={snapLabel} /> : null}
        <Draggable
          nodeRef={ref as React.RefObject<HTMLDivElement>}
          axis="both"
          handle=".bg-ub-window-title"
          grid={grid}
          scale={1}
          onStart={onDragStart}
          onStop={onDragStop}
          onDrag={onDrag}
          allowAnyClick={false}
          defaultPosition={{ x: startX, y: startY }}
          bounds={bounds}
        >
          <div
            ref={ref}
            style={style}
            className={frameClassName}
            id={id ?? undefined}
            role="dialog"
            data-window-state={windowState}
            aria-hidden={ariaHidden}
            aria-label={title}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onFocus={onFocus}
          >
            {children}
          </div>
        </Draggable>
      </>
    );
  },
);

WindowFrame.displayName = 'WindowFrame';

export default React.memo(WindowFrame);
