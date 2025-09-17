'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';

interface DesktopIcon {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  prefetch?: () => void;
}

interface IconsLayerProps {
  icons: DesktopIcon[];
  onOpen: (id: string) => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

interface SelectionRect {
  relative: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  absolute: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

interface DragState {
  pointerId: number | null;
  origin: { x: number; y: number } | null;
  containerRect: DOMRect | null;
  hasMoved: boolean;
}

const DRAG_THRESHOLD_PX = 4;

const intersects = (
  rect: SelectionRect['absolute'],
  box: DOMRect,
): boolean =>
  rect.left <= box.right &&
  rect.right >= box.left &&
  rect.top <= box.bottom &&
  rect.bottom >= box.top;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const IconsLayer: React.FC<IconsLayerProps> = ({
  icons,
  onOpen,
  containerRef,
}) => {
  const iconsRef = useRef(icons);
  const dragStateRef = useRef<DragState>({
    pointerId: null,
    origin: null,
    containerRect: null,
    hasMoved: false,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<SelectionRect | null>(null);

  useEffect(() => {
    iconsRef.current = icons;
    setSelectedIds(prev =>
      prev.filter(id => icons.some(icon => icon.id === id)),
    );
  }, [icons]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSelection = (absoluteRect: SelectionRect['absolute']) => {
      const nextSelected: string[] = [];
      for (const icon of iconsRef.current) {
        const node = document.getElementById(`app-${icon.id}`);
        if (!node) continue;
        const box = node.getBoundingClientRect();
        if (intersects(absoluteRect, box)) {
          nextSelected.push(icon.id);
        }
      }
      setSelectedIds(prev => {
        if (
          prev.length === nextSelected.length &&
          prev.every((value, idx) => value === nextSelected[idx])
        ) {
          return prev;
        }
        return nextSelected;
      });
    };

    const clearDragListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (
        drag.pointerId !== event.pointerId ||
        !drag.origin ||
        !drag.containerRect
      ) {
        return;
      }

      const deltaX = event.clientX - drag.origin.x;
      const deltaY = event.clientY - drag.origin.y;

      if (!drag.hasMoved) {
        if (
          Math.abs(deltaX) < DRAG_THRESHOLD_PX &&
          Math.abs(deltaY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        drag.hasMoved = true;
      }

      const left = Math.min(drag.origin.x, event.clientX);
      const top = Math.min(drag.origin.y, event.clientY);
      const right = Math.max(drag.origin.x, event.clientX);
      const bottom = Math.max(drag.origin.y, event.clientY);

      const relativeLeft = left - drag.containerRect.left;
      const relativeTop = top - drag.containerRect.top;
      const relativeRight = right - drag.containerRect.left;
      const relativeBottom = bottom - drag.containerRect.top;

      setMarquee({
        relative: {
          left: relativeLeft,
          top: relativeTop,
          width: Math.max(0, relativeRight - relativeLeft),
          height: Math.max(0, relativeBottom - relativeTop),
        },
        absolute: { left, top, right, bottom },
      });

      updateSelection({ left, top, right, bottom });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (drag.pointerId !== event.pointerId) return;

      if (!drag.hasMoved) {
        setSelectedIds([]);
      }

      drag.pointerId = null;
      drag.origin = null;
      drag.containerRect = null;
      drag.hasMoved = false;

      setMarquee(null);
      clearDragListeners();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const iconTarget = event.target.closest('[data-context="app"]');
      if (iconTarget) {
        const iconId = iconTarget.getAttribute('data-app-id');
        if (iconId) {
          setSelectedIds(prev =>
            prev.length === 1 && prev[0] === iconId ? prev : [iconId],
          );
        }
        return;
      }

      event.preventDefault();

      const containerRect = container.getBoundingClientRect();
      dragStateRef.current = {
        pointerId: event.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        containerRect,
        hasMoved: false,
      };

      setSelectedIds([]);
      setMarquee(null);

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    };

    container.addEventListener('pointerdown', handlePointerDown);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      clearDragListeners();
      dragStateRef.current = {
        pointerId: null,
        origin: null,
        containerRect: null,
        hasMoved: false,
      };
    };
  }, [containerRef]);

  const badgePosition = useMemo(() => {
    if (!marquee) return null;
    const { relative } = marquee;
    const top = relative.top - 28;
    const left = relative.left;
    return {
      top,
      left,
    };
  }, [marquee]);

  const badgeStyle = useMemo(() => {
    if (!badgePosition || !containerRef.current) return undefined;
    const container = containerRef.current.getBoundingClientRect();
    const maxLeft = container.width - 32;
    return {
      left: `${clamp(badgePosition.left, 0, Math.max(0, maxLeft))}px`,
      top: `${clamp(badgePosition.top, 0, container.height)}px`,
    } as React.CSSProperties;
  }, [badgePosition, containerRef]);

  return (
    <>
      {icons.map(icon => (
        <UbuntuApp
          key={icon.id}
          id={icon.id}
          name={icon.title}
          icon={icon.icon}
          disabled={icon.disabled}
          openApp={() => onOpen(icon.id)}
          prefetch={icon.prefetch}
          isSelected={selectedSet.has(icon.id)}
        />
      ))}
      {marquee ? (
        <div className="pointer-events-none absolute inset-0 z-30">
          <div
            className="absolute rounded-sm border border-ub-orange bg-ub-orange/20"
            style={{
              left: `${marquee.relative.left}px`,
              top: `${marquee.relative.top}px`,
              width: `${marquee.relative.width}px`,
              height: `${marquee.relative.height}px`,
            }}
          />
          {selectedIds.length > 0 && badgeStyle ? (
            <div
              className="absolute flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-ub-orange px-2 text-xs font-semibold text-black shadow-md"
              style={badgeStyle}
            >
              {selectedIds.length}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default IconsLayer;
