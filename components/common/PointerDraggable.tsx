import React, { useMemo, useRef } from "react";
import usePointerDrag, { PointerDragCoordinates } from "../../hooks/usePointerDrag";

export interface PointerDragData {
  x: number;
  y: number;
}

export type PointerDragCallback = (event: PointerEvent, data: PointerDragData) => void;

export interface PointerDraggableProps {
  children: React.ReactElement;
  grid?: [number, number];
  position?: PointerDragData;
  onDrag?: PointerDragCallback;
  onStart?: PointerDragCallback;
  onStop?: PointerDragCallback;
  disabled?: boolean;
  bounds?: "parent";
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const applyGrid = (value: number, size: number | undefined) => {
  if (!size) return value;
  if (!Number.isFinite(size) || size <= 0) return value;
  return Math.round(value / size) * size;
};

const readNumber = (value: unknown, fallback = 0) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

interface DragSnapshot {
  offsetX: number;
  offsetY: number;
  parentRect: DOMRect | null;
  nodeRect: DOMRect;
}

export default function PointerDraggable({
  children,
  grid,
  position,
  onDrag,
  onStart,
  onStop,
  disabled,
  bounds,
}: PointerDraggableProps) {
  const child = React.Children.only(children);
  const nodeRef = useRef<HTMLElement | null>(null);
  const snapshotRef = useRef<DragSnapshot | null>(null);
  const gridValues = useMemo(() => {
    if (!Array.isArray(grid)) return [0, 0] as [number, number];
    const [x, y] = grid;
    return [readNumber(x), readNumber(y)] as [number, number];
  }, [grid]);

  const getPositionFromPointer = (coords: PointerDragCoordinates): PointerDragData => {
    const snapshot = snapshotRef.current;
    const node = nodeRef.current;
    if (!snapshot || !node) {
      const fallbackX = readNumber(position?.x);
      const fallbackY = readNumber(position?.y);
      return { x: fallbackX, y: fallbackY };
    }

    const { parentRect, offsetX, offsetY, nodeRect } = snapshot;
    const [gridX, gridY] = gridValues;

    let rawX = coords.clientX - offsetX;
    let rawY = coords.clientY - offsetY;

    if (parentRect) {
      rawX -= parentRect.left;
      rawY -= parentRect.top;
      const maxX = Math.max(parentRect.width - nodeRect.width, 0);
      const maxY = Math.max(parentRect.height - nodeRect.height, 0);
      rawX = clamp(rawX, 0, maxX);
      rawY = clamp(rawY, 0, maxY);
    }

    const snappedX = applyGrid(rawX, gridX);
    const snappedY = applyGrid(rawY, gridY);
    return { x: snappedX, y: snappedY };
  };

  const pointerHandlers = usePointerDrag<HTMLElement>({
    disabled,
    pointerButton: 0,
    onPointerDown: child.props.onPointerDown,
    onPointerMove: child.props.onPointerMove,
    onPointerUp: child.props.onPointerUp,
    onPointerCancel: child.props.onPointerCancel,
    onStart: (event) => {
      const node = nodeRef.current;
      if (!node) return;
      const parentRect = bounds === "parent" && node.parentElement
        ? node.parentElement.getBoundingClientRect()
        : null;
      const nodeRect = node.getBoundingClientRect();
      const baseX = readNumber(position?.x, parentRect ? nodeRect.left - parentRect.left : nodeRect.left);
      const baseY = readNumber(position?.y, parentRect ? nodeRect.top - parentRect.top : nodeRect.top);
      const referenceLeft = parentRect ? parentRect.left + baseX : baseX;
      const referenceTop = parentRect ? parentRect.top + baseY : baseY;
      snapshotRef.current = {
        offsetX: event.clientX - referenceLeft,
        offsetY: event.clientY - referenceTop,
        parentRect,
        nodeRect,
      };
      if (typeof onStart === "function") {
        onStart(event, { x: baseX, y: baseY });
      }
    },
    onMove: (event, coords) => {
      if (typeof onDrag !== "function") return;
      onDrag(event, getPositionFromPointer(coords));
    },
    onEnd: (event, coords) => {
      if (typeof onStop === "function") {
        onStop(event, getPositionFromPointer(coords));
      }
      snapshotRef.current = null;
    },
    onCancel: (event, coords) => {
      if (typeof onStop === "function") {
        onStop(event, getPositionFromPointer(coords));
      }
      snapshotRef.current = null;
    },
  });

  const assignRef = (instance: HTMLElement | null) => {
    nodeRef.current = instance;
    const { ref } = child as React.ReactElement & { ref?: React.Ref<HTMLElement> };
    if (typeof ref === "function") {
      ref(instance);
    } else if (ref && typeof ref === "object") {
      (ref as React.MutableRefObject<HTMLElement | null>).current = instance;
    }
  };

  const computedStyle = {
    ...child.props.style,
    transform: `translate(${readNumber(position?.x)}px, ${readNumber(position?.y)}px)`,
    touchAction: "none" as const,
  };

  const mergedProps = {
    ...child.props,
    ...pointerHandlers,
    style: computedStyle,
    ref: assignRef,
  };

  return React.cloneElement(child, mergedProps);
}
