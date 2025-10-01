"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Orientation = 'horizontal' | 'vertical';

type PaneProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'ref'> & {
  ref?: React.Ref<HTMLDivElement>;
};

export interface SplitPaneProps {
  orientation: Orientation;
  size: number;
  minSize?: number;
  maxSize?: number;
  onSizeChange?: (size: number) => void;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
  firstPaneProps?: PaneProps;
  secondPaneProps?: PaneProps;
  dividerLabel?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const SplitPane: React.FC<SplitPaneProps> = ({
  orientation,
  size,
  minSize = 0.1,
  maxSize = 0.9,
  onSizeChange,
  children,
  className = '',
  firstPaneProps,
  secondPaneProps,
  dividerLabel = 'Resize split panes',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const panes = useMemo(() => React.Children.toArray(children).slice(0, 2), [children]);
  const [firstChild, secondChild] = panes as [React.ReactNode, React.ReactNode];

  const {
    ref: firstRef,
    className: firstClassName,
    style: firstStyleProps,
    ...firstRest
  } = firstPaneProps ?? {};
  const {
    ref: secondRef,
    className: secondClassName,
    style: secondStyleProps,
    ...secondRest
  } = secondPaneProps ?? {};

  const min = Math.max(0, minSize);
  const max = Math.min(1, maxSize);
  const clampedSize = clamp(size, min, max);

  const computeSizeFromPointer = useCallback(
    (event: Pick<PointerEvent, 'clientX' | 'clientY'>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const ratio =
        orientation === 'horizontal'
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height;
      const next = clamp(ratio, min, max);
      onSizeChange?.(next);
    },
    [max, min, onSizeChange, orientation],
  );

  useEffect(() => {
    if (activePointerId === null) return;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      computeSizeFromPointer(event);
    };

    const handleEnd = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      setActivePointerId(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }, [activePointerId, computeSizeFromPointer]);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setActivePointerId(event.pointerId);
  };

  const stopDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setActivePointerId(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const smallStep = 0.02;
    const largeStep = 0.1;
    const step = event.shiftKey ? largeStep : smallStep;

    const adjust = (delta: number) => {
      const next = clamp(clampedSize + delta, min, max);
      if (next !== clampedSize) {
        onSizeChange?.(next);
      }
    };

    if (orientation === 'horizontal') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        adjust(-step);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        adjust(step);
      }
    } else {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        adjust(-step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        adjust(step);
      }
    }
  };

  const orientationClass =
    orientation === 'horizontal' ? 'flex-row' : 'flex-col';

  const separatorOrientation =
    orientation === 'horizontal' ? 'vertical' : 'horizontal';

  const handleClassName = [
    'relative flex items-center justify-center bg-gray-800 text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-focus-ring] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
    orientation === 'horizontal'
      ? 'cursor-col-resize min-w-[44px]'
      : 'cursor-row-resize min-h-[44px]',
  ].join(' ');

  const lineClass =
    orientation === 'horizontal'
      ? 'h-full w-px bg-gray-600'
      : 'w-full h-px bg-gray-600';

  const firstStyle =
    orientation === 'horizontal'
      ? { flexBasis: `${clampedSize * 100}%` }
      : { flexBasis: `${clampedSize * 100}%` };

  const secondStyle =
    orientation === 'horizontal'
      ? { flexBasis: `${(1 - clampedSize) * 100}%` }
      : { flexBasis: `${(1 - clampedSize) * 100}%` };

  const sharedPaneClasses =
    'flex-1 min-w-0 min-h-0 overflow-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-focus-ring] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';

  return (
    <div
      ref={containerRef}
      className={`flex ${orientationClass} w-full h-full ${className}`.trim()}
    >
      <div
        {...firstRest}
        ref={firstRef as React.Ref<HTMLDivElement>}
        className={`${sharedPaneClasses} ${firstClassName ?? ''}`.trim()}
        style={{ ...firstStyle, ...(firstStyleProps ?? {}) }}
      >
        {firstChild}
      </div>
      <button
        type="button"
        role="separator"
        aria-orientation={separatorOrientation}
        aria-valuenow={Math.round(clampedSize * 100)}
        aria-valuemin={Math.round(min * 100)}
        aria-valuemax={Math.round(max * 100)}
        aria-label={dividerLabel}
        className={handleClassName}
        onPointerDown={startDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={handleKeyDown}
      >
        <span aria-hidden="true" className={lineClass} />
      </button>
      <div
        {...secondRest}
        ref={secondRef as React.Ref<HTMLDivElement>}
        className={`${sharedPaneClasses} ${secondClassName ?? ''}`.trim()}
        style={{ ...secondStyle, ...(secondStyleProps ?? {}) }}
      >
        {secondChild}
      </div>
    </div>
  );
};

export default SplitPane;
